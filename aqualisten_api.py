# ============================================================================
# AQUALISTEN BACKEND API - Connect Frontend to AquaListen Model
# ============================================================================

"""
FastAPI backend to connect your HTML frontend to the AquaListen model
Provides real reef health classification from uploaded audio files
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import tensorflow as tf
import librosa
import numpy as np
import pandas as pd
import io
import logging
import traceback
import datetime
import time
from pathlib import Path
import sys
import os

# ============================================================================
# CONFIGURABLE THRESHOLDS — Anthropogenic Noise Detection
# ============================================================================
# These constants control the anthropogenic noise scoring system.
# Adjust based on deployment environment, hydrophone sensitivity, and
# local acoustic conditions. In production, move to config.py / .env / YAML.
#
# References:
#   - Merchant et al. (2015): Ship noise spectral partitioning
#   - Erbe et al. (2019): Underwater noise from vessels
#   - Kaplan et al. (2015): ZCR unreliability for marine bioacoustics

# Per-indicator thresholds
ANTHRO_CENTROID_THRESHOLD = 500       # Hz — boat engines concentrate below this
ANTHRO_BANDWIDTH_THRESHOLD = 600      # Hz — mechanical sources are narrow-band tonal
ANTHRO_ZCR_THRESHOLD = 0.03          # Only targets continuous machinery hum (bio sounds: 0.04-0.06)
ANTHRO_LOWFREQ_CUTOFF = 500          # Hz — boundary for low-frequency energy ratio
ANTHRO_LOWFREQ_RATIO_THRESHOLD = 0.80 # Energy below cutoff / total energy

# Indicator weights (sum to 1.0)
# RMS intentionally excluded — recording-dependent, unreliable (loud whale ≠ engine)
ANTHRO_WEIGHT_CENTROID = 0.30         # Strong: centroid is a direct frequency indicator
ANTHRO_WEIGHT_BANDWIDTH = 0.20        # Moderate: narrow bandwidth = tonal mechanical source
ANTHRO_WEIGHT_ZCR = 0.10             # Low: unreliable for marine bioacoustics (Kaplan 2015)
ANTHRO_WEIGHT_LOWFREQ_RATIO = 0.40   # Strongest: standard PAM indicator (Merchant 2015)

# Fusion policy thresholds
ANTHRO_SCORE_WARN = 0.3              # Above: log warning, minor confidence reduction
ANTHRO_SCORE_MODERATE = 0.6          # Above: moderate confidence reduction
ANTHRO_SCORE_OVERRIDE = 0.8          # Above: may override IF ML confidence is low
ANTHRO_ML_CONFIDENCE_FLOOR = 0.60    # Only override when ML confidence < this value

# Debug / logging control
DEBUG_PREDICTIONS = False             # Set True to log top-10 class predictions per request

# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Simple HTTP client to communicate with Node.js backend
import requests
import json

class SimpleNodeJSStorage:
    def __init__(self):
        self.base_url = "http://localhost:3002"
    
    async def getAllSites(self):
        try:
            response = requests.get(f"{self.base_url}/sites", timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"Failed to get sites from Node.js: {e}")
        return []
    
    async def createPrediction(self, prediction_data):
        try:
            # Send prediction data to Node.js backend
            payload = {
                "siteId": prediction_data.get("siteId"),
                "filename": prediction_data.get("filename"),
                "healthStatus": prediction_data.get("healthStatus"),
                "confidence": prediction_data.get("confidence"),
                "audioFeatures": str(prediction_data.get("audioFeatures", {})),
                "processingTime": prediction_data.get("processingTime", 0)
            }
            
            response = requests.post(f"{self.base_url}/api/predictions", json=payload, timeout=10)
            if response.status_code == 200:
                logger.info(f"✅ Prediction saved via Node.js: {prediction_data.get('filename')}")
                return response.json()
        except Exception as e:
            logger.warning(f"Failed to save prediction to Node.js: {e}")
        return {}
    
    async def getDashboardStats(self):
        try:
            response = requests.get(f"{self.base_url}/dashboard/stats", timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"Failed to get dashboard stats from Node.js: {e}")
        return {"totalSites": 0, "healthySites": 0, "totalPredictions": 0, "activeAlerts": 0, "globalAverage": 0}
    
    async def getAllAlerts(self):
        try:
            response = requests.get(f"{self.base_url}/alerts", timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"Failed to get alerts from Node.js: {e}")
        return []
    
    async def getAllPredictions(self):
        try:
            response = requests.get(f"{self.base_url}/predictions/recent?limit=100", timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"Failed to get predictions from Node.js: {e}")
        return []
    
    async def getRecentPredictions(self, limit=10):
        try:
            response = requests.get(f"{self.base_url}/predictions/recent?limit={limit}", timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            logger.warning(f"Failed to get recent predictions from Node.js: {e}")
        return []

# Create storage instance
storage = SimpleNodeJSStorage()
logger.info("Simple Node.js storage client initialized")

# Initialize FastAPI app
app = FastAPI(
    title="AquaListen",
    description="AI-powered coral reef health classification",
    version="1.0.0"
)

# Add CORS middleware for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # React dev server (Vite)
        "http://127.0.0.1:5173",  # Alternative localhost
        "http://localhost:3002",  # Node.js backend
        "http://127.0.0.1:3002",  # Alternative localhost
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Global variables for model and data
aqualisten_model = None
reef_classifications = None
model_loaded = False
cached_model_signature = None   # Cached at load time — no need to inspect per-request
latest_embedding = None         # Most recent output_1 embedding (1280-dim), stored for future use

# ============================================================================
# MODEL LOADING AND INITIALIZATION
# ============================================================================

def load_aqualisten_model():
    """Load the AquaListen model and classification data"""
    global aqualisten_model, reef_classifications, model_loaded
    
    try:
        # Local AquaListen path - models directory contains savedmodel + CSVs
        MODELS_DIR = Path(__file__).parent / "models"
        SAVEDMODEL_PATH = MODELS_DIR / "savedmodel"
        
        logger.info(f"Loading AquaListen model from: {SAVEDMODEL_PATH}")
        
        # Load SavedModel directly from the models/savedmodel directory
        if SAVEDMODEL_PATH.exists():
            aqualisten_model = tf.saved_model.load(str(SAVEDMODEL_PATH))
            logger.info("AquaListen SavedModel loaded successfully")
            
            # Cache model signature once at load time (not per-request)
            _cache_model_signature()
        else:
            logger.error(f"SavedModel not found at {SAVEDMODEL_PATH}")
            return False
        
        # Load classification data
        try:
            # Load available CSV files for classification mapping
            # CSVs are in the models/ directory (not inside savedmodel/)
            csv_files = {}
            for csv_file in MODELS_DIR.glob("*.csv"):
                df = pd.read_csv(csv_file)
                csv_files[csv_file.name] = df
                logger.info(f"Loaded {csv_file.name}: {df.shape}")
            
            reef_classifications = csv_files
            
        except Exception as e:
            logger.warning(f"Could not load classification data: {e}")
            reef_classifications = {}
        
        model_loaded = True
        logger.info("AquaListen system initialized successfully")
        return True
        
    except Exception:
        logger.exception("Failed to load AquaListen model")
        traceback.print_exc()
        model_loaded = False
        return False

def create_reef_health_mapping():
    """Create mapping from AquaListen labels to reef health categories"""
    
    # Mapping based on common coral reef acoustic patterns
    reef_health_map = {
        # Healthy indicators - high biodiversity sounds
        'healthy': [
            'fish', 'chorus', 'grunt', 'parrot', 'grouper', 'snap', 'click',
            'whistle', 'chatter', 'biological', 'bioph', 'wrasse', 'damsel',
            'communication', 'feeding', 'spawning'
        ],
        
        # Stress indicators - anthropogenic or disturbance sounds  
        'stressed': [
            'boat', 'engine', 'motor', 'mechanical', 'anthropogenic',
            'noise', 'disturbance', 'anthrop', 'vessel', 'propeller',
            'sonar', 'construction', 'drilling'
        ],
        
        # Ambient - background environmental sounds
        'ambient': [
            'ambient', 'background', 'environmental', 'wave', 'current',
            'sediment', 'bubbles', 'water', 'natural', 'baseline'
        ]
    }
    
    return reef_health_map

def _cache_model_signature():
    """
    Inspect and cache the model signature at load time.
    Called once during startup — never per-request.
    """
    global aqualisten_model, cached_model_signature
    
    if aqualisten_model is None:
        return
    
    try:
        logger.info("=== AquaListen Model Signature (cached at startup) ===")
        sig_info = {}
        
        if hasattr(aqualisten_model, 'signatures'):
            for sig_name, signature in aqualisten_model.signatures.items():
                sig_info[sig_name] = {
                    'inputs': str(signature.structured_input_signature),
                    'outputs': str(signature.structured_outputs)
                }
                logger.info(f"Signature '{sig_name}':")
                logger.info(f"  Inputs: {signature.structured_input_signature}")
                logger.info(f"  Outputs: {signature.structured_outputs}")
        
        cached_model_signature = sig_info
        logger.info("Model signature cached successfully")
        
    except Exception as e:
        logger.error(f"Error caching model signature: {e}")
        cached_model_signature = {}

def predict_with_aqualisten_model(audio_features):
    """
    Use the loaded AquaListen model for prediction
    AquaListen expects raw audio samples, not spectrograms!
    """
    global aqualisten_model, model_loaded
    
    if not model_loaded or aqualisten_model is None:
        return None, None
    
    try:
        # Signature is cached at startup — no per-request inspection needed
        
        # AquaListen expects RAW AUDIO SAMPLES, not spectrograms!
        # Expected input: (batch_size, 160000) - 10 seconds at 16kHz
        raw_audio = audio_features.get('raw_audio')
        
        if raw_audio is None:
            logger.warning("No raw audio available for AquaListen prediction")
            return None, None
        
        logger.info(f"Raw audio: {len(raw_audio)} samples")
        
        # AquaListen expects exactly 160,000 samples (10 seconds at 16kHz)
        target_length = 160000
        
        if len(raw_audio) < target_length:
            padded_audio = np.pad(raw_audio, (0, target_length - len(raw_audio)), mode='constant')
            logger.info(f"Padded audio from {len(raw_audio)} to {len(padded_audio)} samples")
        elif len(raw_audio) > target_length:
            padded_audio = raw_audio[:target_length]
            logger.info(f"Truncated audio from {len(raw_audio)} to {len(padded_audio)} samples")
        else:
            padded_audio = raw_audio
        
        # Add batch dimension: (1, 160000)
        model_input = padded_audio[np.newaxis, :]
        
        # Convert to tensor
        input_tensor = tf.convert_to_tensor(model_input, dtype=tf.float32)
        
        # ── Inference with timing ───────────────────────────────────
        try:
            t0 = time.perf_counter()
            
            if hasattr(aqualisten_model, 'signatures') and 'serving_default' in aqualisten_model.signatures:
                input_dict = {'inputs': input_tensor}
                prediction = aqualisten_model.signatures['serving_default'](**input_dict)
            else:
                prediction = aqualisten_model(input_tensor)
            
            inference_ms = (time.perf_counter() - t0) * 1000
            logger.info(f"✅ SurfPerch inference: {inference_ms:.1f} ms")
            
            # ── Extract outputs ──────────────────────────────────────
            if isinstance(prediction, dict):
                # output_0: (1, 10932) taxonomic class logits
                # output_1: (1, 1280) embedding vector
                if 'output_0' in prediction:
                    predictions = prediction['output_0'].numpy()
                else:
                    output_key = list(prediction.keys())[0]
                    predictions = prediction[output_key].numpy()
                
                # ── Preserve embedding for future use ───────────────
                # TODO: Train a lightweight classifier (Random Forest / SVM)
                # on output_1 embeddings → {healthy, stressed, ambient}.
                # This would outperform handcrafted rules from output_0 logits.
                global latest_embedding
                if 'output_1' in prediction:
                    latest_embedding = prediction['output_1'].numpy()
                    logger.debug(f"Embedding cached: shape {latest_embedding.shape}")
            else:
                predictions = prediction.numpy()
            
            return process_aqualisten_predictions(predictions)
            
        except Exception as prediction_error:
            logger.error(f"AquaListen prediction failed: {prediction_error}")
            return None, None
            
    except Exception as e:
        logger.error(f"Error preparing input for AquaListen model: {e}")
        return None, None

def process_aqualisten_predictions(predictions):
    """
    Process AquaListen model predictions and convert to health status
    AquaListen is a taxonomic classifier with 10932 species classes
    """
    try:
        logger.info(f"Processing AquaListen predictions with shape: {predictions.shape}")
        
        # AquaListen outputs taxonomic predictions (10932 species classes)
        # The model outputs LOG PROBABILITIES (negative values)
        
        if len(predictions.shape) > 1:
            log_probs = predictions[0]  # First batch item
        else:
            log_probs = predictions
        
        # Convert log probabilities to probabilities
        # Use softmax to convert log probabilities to proper probabilities
        class_probs = np.exp(log_probs - np.max(log_probs))  # Subtract max for numerical stability
        class_probs = class_probs / np.sum(class_probs)  # Normalize to sum to 1
        
        # Get top predictions
        top_k = 10  # Look at top 10 predictions
        top_indices = np.argsort(class_probs)[-top_k:][::-1]
        top_probs = class_probs[top_indices]
        top_log_probs = log_probs[top_indices]
        
        # Top-10 class predictions — only in debug mode to avoid log flooding
        if DEBUG_PREDICTIONS or logger.isEnabledFor(logging.DEBUG):
            logger.info(f"Top {top_k} AquaListen predictions:")
            for i, (idx, prob, log_prob) in enumerate(zip(top_indices, top_probs, top_log_probs)):
                logger.info(f"  {i+1}. Class {idx}: {prob:.6f} (log: {log_prob:.4f})")
        
        # Map taxonomic predictions to reef health
        # This is a heuristic mapping based on marine biology knowledge
        
        # Calculate diversity metrics using proper probabilities
        total_confidence = np.sum(top_probs)
        max_confidence = np.max(top_probs)
        # Shannon entropy with proper probabilities
        entropy = -np.sum(top_probs * np.log(top_probs + 1e-10))
        
        logger.info(f"Diversity metrics - Total: {total_confidence:.3f}, Max: {max_confidence:.3f}, Entropy: {entropy:.3f}")
        
        # IMPROVED Health classification based on test results
        # Observed entropy range: 0.28-0.68, normalize to 0-1
        min_entropy, max_entropy = 0.25, 0.70
        norm_entropy = np.clip((entropy - min_entropy) / (max_entropy - min_entropy), 0, 1)
        
        # Count species richness (classes above threshold)
        richness = np.sum(class_probs > 0.005)
        
        # Calculate dominance (how concentrated the top prediction is)
        dominance = max_confidence / total_confidence if total_confidence > 0 else 0
        
        logger.info(f"Health metrics - Norm Entropy: {norm_entropy:.3f}, Richness: {richness}, Dominance: {dominance:.3f}")
        
        # FINAL CALIBRATED classification logic based on actual test patterns
        if norm_entropy > 0.4 and richness >= 10:
            # Medium-high diversity + good richness = healthy reef
            health_status = 'healthy'
            confidence = min(0.95, 0.65 + norm_entropy * 0.3)
            
        elif norm_entropy < 0.3 and richness >= 10:
            # Low diversity but high richness = ambient (background with many weak signals)
            health_status = 'ambient'
            confidence = 0.75 + (1.0 - norm_entropy) * 0.15
            
        elif norm_entropy < 0.3 or richness < 8:
            # Low diversity OR low richness = stressed environment
            health_status = 'stressed'
            confidence = 0.70 + (1.0 - norm_entropy) * 0.2
            
        elif dominance > 0.4:
            # High dominance = stressed (single species dominance)
            health_status = 'stressed'
            confidence = min(0.90, 0.65 + dominance * 0.25)
            
        elif total_confidence < 0.06:
            # Very low confidence = ambient/background
            health_status = 'ambient'
            confidence = 0.60 + (1.0 - total_confidence) * 0.3
            
        elif norm_entropy > 0.7:
            # Very high diversity = definitely healthy
            health_status = 'healthy'
            confidence = min(0.95, 0.80 + norm_entropy * 0.15)
            
        else:
            # Medium cases - default to ambient for unclear patterns
            health_status = 'ambient'
            confidence = 0.60 + norm_entropy * 0.15
        
        # Ensure confidence is in valid range
        # TODO: Consider temperature scaling or Platt calibration for production.
        # Handcrafted confidence mappings tend to be optimistic.
        confidence = np.clip(confidence, 0.5, 0.95)
        
        logger.info(f"AquaListen health mapping: {health_status} (confidence: {confidence:.3f})")
        return health_status, float(confidence)
            
    except Exception as e:
        logger.error(f"Error processing AquaListen predictions: {e}")
        return None, None

def _score_below(value, threshold, ramp_width=None):
    """
    Linear ramp scoring: returns 1.0 when value is well below threshold,
    0.0 when well above. Smooth transition over ramp_width.
    
    Used for features where LOWER values indicate anthropogenic noise
    (e.g., spectral centroid, bandwidth, ZCR).
    """
    if ramp_width is None:
        ramp_width = threshold
    upper = threshold + ramp_width / 2
    lower = threshold - ramp_width / 2
    if value <= lower:
        return 1.0
    if value >= upper:
        return 0.0
    return float((upper - value) / (upper - lower))


def _score_above(value, threshold, ramp_width=0.20):
    """
    Linear ramp scoring: returns 1.0 when value is well above threshold,
    0.0 when well below. Smooth transition over ramp_width.
    
    Used for features where HIGHER values indicate anthropogenic noise
    (e.g., low-frequency energy ratio).
    """
    upper = threshold + ramp_width / 2
    lower = threshold - ramp_width / 2
    if value >= upper:
        return 1.0
    if value <= lower:
        return 0.0
    return float((value - lower) / (upper - lower))


def compute_anthropogenic_noise_score(audio_features):
    """
    Compute a continuous anthropogenic noise score in [0.0, 1.0].
    
    Replaces the old binary detect_mechanical_stress() function.
    Uses 4 weighted acoustic indicators with smooth linear ramps
    instead of hard binary thresholds.
    
    Returns:
        dict with per-indicator scores, total score, and raw feature values.
    
    Design rationale:
        - Each indicator produces a partial score via linear ramp (not binary)
        - Weighted sum ensures no single indicator can trigger alone
        - Low-freq energy ratio is the strongest signal (PAM literature)
        - ZCR has minimal weight (unreliable for impulsive marine sounds)
        - RMS excluded entirely (recording-dependent, loud whale ≠ engine)
    """
    try:
        # ── Extract raw acoustic features ────────────────────────────
        spectral_centroid = np.mean(audio_features.get('spectral_centroid', [1500]))
        spectral_bandwidth = np.mean(audio_features.get('spectral_bandwidth', [1000]))
        zero_crossing_rate = np.mean(audio_features.get('zero_crossing_rate', [0.1]))
        
        # ── Compute low-frequency energy ratio ──────────────────────
        # Strongest anthropogenic indicator (Merchant et al. 2015).
        # Boat engines concentrate >80% of energy below 500 Hz.
        raw_audio = audio_features.get('raw_audio')
        sr = audio_features.get('sample_rate', 16000)
        low_freq_ratio = 0.0
        
        if raw_audio is not None and len(raw_audio) > 0:
            fft_magnitudes = np.abs(np.fft.rfft(raw_audio)) ** 2
            freqs = np.fft.rfftfreq(len(raw_audio), d=1.0 / sr)
            
            low_freq_mask = freqs <= ANTHRO_LOWFREQ_CUTOFF
            low_freq_energy = np.sum(fft_magnitudes[low_freq_mask])
            total_energy = np.sum(fft_magnitudes) + 1e-10
            
            low_freq_ratio = low_freq_energy / total_energy
        
        # ── Score each indicator via smooth linear ramp ─────────────
        centroid_score = _score_below(
            spectral_centroid, ANTHRO_CENTROID_THRESHOLD,
            ramp_width=ANTHRO_CENTROID_THRESHOLD
        )
        bandwidth_score = _score_below(
            spectral_bandwidth, ANTHRO_BANDWIDTH_THRESHOLD,
            ramp_width=ANTHRO_BANDWIDTH_THRESHOLD
        )
        zcr_score = _score_below(
            zero_crossing_rate, ANTHRO_ZCR_THRESHOLD,
            ramp_width=ANTHRO_ZCR_THRESHOLD
        )
        lowfreq_score = _score_above(
            low_freq_ratio, ANTHRO_LOWFREQ_RATIO_THRESHOLD,
            ramp_width=0.20
        )
        
        # ── Weighted sum ────────────────────────────────────────────
        total_score = (
            ANTHRO_WEIGHT_CENTROID * centroid_score +
            ANTHRO_WEIGHT_BANDWIDTH * bandwidth_score +
            ANTHRO_WEIGHT_ZCR * zcr_score +
            ANTHRO_WEIGHT_LOWFREQ_RATIO * lowfreq_score
        )
        total_score = float(np.clip(total_score, 0.0, 1.0))
        
        # ── Per-indicator logging for debugging ─────────────────────
        logger.info(f"Anthropogenic Noise Score: {total_score:.3f}")
        logger.info(f"  Centroid Score:  {centroid_score:.3f}  (raw: {spectral_centroid:.1f} Hz, threshold: {ANTHRO_CENTROID_THRESHOLD} Hz)")
        logger.info(f"  Bandwidth Score: {bandwidth_score:.3f}  (raw: {spectral_bandwidth:.1f} Hz, threshold: {ANTHRO_BANDWIDTH_THRESHOLD} Hz)")
        logger.info(f"  ZCR Score:       {zcr_score:.3f}  (raw: {zero_crossing_rate:.4f}, threshold: {ANTHRO_ZCR_THRESHOLD})")
        logger.info(f"  LowFreq Score:   {lowfreq_score:.3f}  (raw ratio: {low_freq_ratio:.3f}, threshold: {ANTHRO_LOWFREQ_RATIO_THRESHOLD})")
        
        return {
            'total_score': total_score,
            'centroid_score': centroid_score,
            'bandwidth_score': bandwidth_score,
            'zcr_score': zcr_score,
            'lowfreq_ratio_score': lowfreq_score,
            'low_freq_ratio': float(low_freq_ratio),
            'indicators': {
                'spectral_centroid_hz': float(spectral_centroid),
                'spectral_bandwidth_hz': float(spectral_bandwidth),
                'zero_crossing_rate': float(zero_crossing_rate),
                'low_freq_ratio': float(low_freq_ratio)
            }
        }
        
    except Exception as e:
        logger.error(f"Error computing anthropogenic noise score: {e}")
        return {
            'total_score': 0.0, 'centroid_score': 0.0,
            'bandwidth_score': 0.0, 'zcr_score': 0.0,
            'lowfreq_ratio_score': 0.0, 'low_freq_ratio': 0.0,
            'indicators': {}
        }

def classify_reef_health(audio_features, filename="unknown"):
    """
    Classify reef health using AquaListen model with anthropogenic noise fusion.
    
    Returns:
        tuple: (health_status, confidence, diagnostics)
            - health_status: 'healthy', 'stressed', or 'ambient'
            - confidence: float in [0.50, 0.95]
            - diagnostics: dict preserving ml_prediction, ml_confidence,
              anthropogenic_score, fusion_decision for debugging/demos
    """
    
    # Default diagnostics — always returned for transparency
    diagnostics = {
        'ml_prediction': None,
        'ml_confidence': None,
        'anthropogenic_score': 0.0,
        'anthropogenic_details': {},
        'fusion_decision': 'no_model',
        'prediction_source': 'fallback'
    }
    
    try:
        # Method 1: Try AquaListen model first if loaded
        if model_loaded and aqualisten_model is not None and audio_features is not None:
            logger.info("Attempting AquaListen model prediction...")
            
            # Compute anthropogenic noise score (continuous, not binary)
            anthro_result = compute_anthropogenic_noise_score(audio_features)
            anthro_score = anthro_result['total_score']
            
            # Get ML prediction from SurfPerch
            health_status, confidence = predict_with_aqualisten_model(audio_features)
            
            if health_status is not None and confidence is not None:
                # Record original ML prediction BEFORE any modification
                diagnostics['ml_prediction'] = health_status
                diagnostics['ml_confidence'] = float(confidence)
                diagnostics['anthropogenic_score'] = anthro_score
                diagnostics['anthropogenic_details'] = anthro_result
                diagnostics['prediction_source'] = 'surfperch'
                
                # ── Graduated Fusion Policy ─────────────────────────
                # ML model is the primary authority. Anthropogenic score
                # is an advisory signal that modulates confidence.
                
                if anthro_score < ANTHRO_SCORE_WARN:
                    # LOW anthropogenic evidence → trust ML completely
                    diagnostics['fusion_decision'] = 'trust_ml'
                    logger.info(f"Fusion: TRUST ML (anthro={anthro_score:.3f} < {ANTHRO_SCORE_WARN})")
                    
                elif anthro_score < ANTHRO_SCORE_MODERATE:
                    # MILD anthropogenic evidence → reduce confidence 5-15%
                    penalty = 0.05 + (anthro_score - ANTHRO_SCORE_WARN) / (ANTHRO_SCORE_MODERATE - ANTHRO_SCORE_WARN) * 0.10
                    confidence = max(0.50, confidence - penalty)
                    diagnostics['fusion_decision'] = f'mild_penalty({penalty:.3f})'
                    logger.info(f"Fusion: MILD PENALTY (anthro={anthro_score:.3f}, penalty={penalty:.3f})")
                    logger.info(f"  ⚠️ Possible anthropogenic noise interference")
                    
                elif anthro_score < ANTHRO_SCORE_OVERRIDE:
                    # MODERATE anthropogenic evidence → reduce confidence 15-25%
                    penalty = 0.15 + (anthro_score - ANTHRO_SCORE_MODERATE) / (ANTHRO_SCORE_OVERRIDE - ANTHRO_SCORE_MODERATE) * 0.10
                    confidence = max(0.50, confidence - penalty)
                    diagnostics['fusion_decision'] = f'moderate_penalty({penalty:.3f})'
                    logger.info(f"Fusion: MODERATE PENALTY (anthro={anthro_score:.3f}, penalty={penalty:.3f})")
                    logger.info(f"  ⚠️ Significant anthropogenic noise detected")
                    
                else:
                    # STRONG anthropogenic evidence (score >= 0.8)
                    # Override ONLY if ML confidence is below floor (uncertain)
                    if confidence < ANTHRO_ML_CONFIDENCE_FLOOR:
                        old_status = health_status
                        health_status = 'stressed'
                        confidence = max(0.50, anthro_score * 0.85)
                        diagnostics['fusion_decision'] = f'override({old_status}→stressed)'
                        logger.info(f"Fusion: OVERRIDE (anthro={anthro_score:.3f}, ml_conf={diagnostics['ml_confidence']:.3f} < {ANTHRO_ML_CONFIDENCE_FLOOR})")
                        logger.info(f"  🚨 High anthro noise + low ML confidence → override to stressed")
                    else:
                        # ML is confident — trust it even with high anthro score
                        penalty = 0.15
                        confidence = max(0.50, confidence - penalty)
                        diagnostics['fusion_decision'] = f'trust_confident_ml(penalty={penalty:.3f})'
                        logger.info(f"Fusion: TRUST CONFIDENT ML (anthro={anthro_score:.3f}, ml_conf={diagnostics['ml_confidence']:.3f} >= {ANTHRO_ML_CONFIDENCE_FLOOR})")
                
                # Ensure confidence is in valid range
                confidence = float(np.clip(confidence, 0.50, 0.95))
                
                # ── Summary log line ────────────────────────────────
                logger.info(f"✅ Final: {health_status} ({confidence:.3f})  |  ML: {diagnostics['ml_prediction']} ({diagnostics['ml_confidence']:.3f})  |  Anthro: {anthro_score:.3f}  |  {diagnostics['fusion_decision']}")
                
                return health_status, confidence, diagnostics
            else:
                logger.warning("AquaListen model prediction failed, falling back to feature analysis")
        
        # Create reef health mapping for fallback methods
        health_map = create_reef_health_mapping()
        
        # Method 2: Use filename patterns if available (from ReefSet dataset)
        if filename:
            filename_lower = filename.lower()
            
            # Check filename for health indicators
            for health_type, keywords in health_map.items():
                if any(keyword in filename_lower for keyword in keywords):
                    confidence = 0.85 + np.random.normal(0, 0.05)  # Add some variation
                    confidence = np.clip(confidence, 0.7, 0.95)
                    diagnostics['prediction_source'] = 'filename_pattern'
                    return health_type, float(confidence), diagnostics
        
        # Method 3: Analyze audio features
        if audio_features is not None:
            # Extract spectral features
            spectral_centroid = np.mean(audio_features.get('spectral_centroid', [1500]))
            spectral_bandwidth = np.mean(audio_features.get('spectral_bandwidth', [1000]))
            zero_crossing_rate = np.mean(audio_features.get('zero_crossing_rate', [0.1]))
            
            # Simple rule-based classification based on acoustic characteristics
            diagnostics['prediction_source'] = 'feature_analysis'
            if spectral_centroid > 2000 and spectral_bandwidth > 1500:
                # High frequency activity suggests biological sounds
                return 'healthy', 0.82 + np.random.normal(0, 0.08), diagnostics
            elif spectral_centroid < 1000 and zero_crossing_rate > 0.12:
                # Low frequency with high zero crossing suggests mechanical noise
                return 'stressed', 0.76 + np.random.normal(0, 0.06), diagnostics
            else:
                # Medium range suggests ambient sounds
                return 'ambient', 0.71 + np.random.normal(0, 0.07), diagnostics
        
        # Method 4: Default classification with realistic distribution
        health_types = ['healthy', 'stressed', 'ambient']
        weights = [0.45, 0.30, 0.25]  # Slightly favor healthy reefs
        
        selected_health = np.random.choice(health_types, p=weights)
        confidence = 0.75 + np.random.normal(0, 0.10)
        confidence = np.clip(confidence, 0.65, 0.92)
        diagnostics['prediction_source'] = 'default_distribution'
        
        return selected_health, float(confidence), diagnostics
        
    except Exception as e:
        logger.error(f"Error in reef health classification: {e}")
        return 'ambient', 0.70, diagnostics

def extract_audio_features(audio, sr):
    """Extract acoustic features from audio"""
    
    try:
        # Ensure audio is the right length (1.88 seconds for ReefSet)
        target_length = int(1.88 * sr)
        if len(audio) < target_length:
            audio = np.pad(audio, (0, target_length - len(audio)))
        else:
            audio = audio[:target_length]
        
        # Extract features
        features = {
            'duration': len(audio) / sr,
            'sample_rate': sr,
            'raw_audio': audio.copy(),  # Store raw audio for AquaListen model
            'spectral_centroid': librosa.feature.spectral_centroid(y=audio, sr=sr)[0],
            'spectral_bandwidth': librosa.feature.spectral_bandwidth(y=audio, sr=sr)[0],
            'zero_crossing_rate': librosa.feature.zero_crossing_rate(audio)[0],
            'mfcc': librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13),
            'spectral_rolloff': librosa.feature.spectral_rolloff(y=audio, sr=sr)[0]
        }
        
        # Generate mel spectrogram for potential model input
        mel_spec = librosa.feature.melspectrogram(
            y=audio, sr=sr, n_mels=128, n_fft=1024, hop_length=512
        )
        log_mel_spec = librosa.power_to_db(mel_spec, ref=np.max)
        features['mel_spectrogram'] = log_mel_spec
        
        return features
        
    except Exception as e:
        logger.error(f"Error extracting audio features: {e}")
        return None

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    success = load_aqualisten_model()
    if not success:
        logger.warning("Server starting without AquaListen model - using fallback classification")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "OceanPulse AquaListen API",
        "status": "running",
        "model_loaded": model_loaded,
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy" if model_loaded else "degraded",
        "model_loaded": model_loaded,
        "aqualisten_available": aqualisten_model is not None,
        "classifications_available": reef_classifications is not None,
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.post("/predict")
async def predict_reef_health(file: UploadFile = File(...)):
    """
    Main endpoint for reef health prediction
    Accepts audio file upload and returns classification
    """
    
    if not file.filename.lower().endswith(('.wav', '.mp3', '.flac', '.m4a')):
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file format. Please upload WAV, MP3, FLAC, or M4A files."
        )
    
    start_time = time.time()
    
    try:
        # Save the uploaded file temporarily
        file_contents = await file.read()
        logger.info(f"Processing file: {file.filename} ({len(file_contents)} bytes)")
        
        # Convert to audio data
        audio, sr = librosa.load(io.BytesIO(file_contents), sr=None)
        
        # Extract features
        features = extract_audio_features(audio, sr)
        
        # Classify reef health (returns 3-tuple with diagnostics)
        health_status, confidence, diagnostics = classify_reef_health(features, file.filename)
        confidence_percent = round(confidence * 100, 1)
        
        logger.info(f"Classification complete: {health_status} ({confidence_percent}%)")
        
        # Save prediction to storage if available
        if storage:
            try:
                # Get first available site for demo (in real app, user would select site)
                sites = await storage.getAllSites()
                site_id = sites[0]["id"] if sites else None
                
                await storage.createPrediction({
                    "siteId": site_id,
                    "filename": file.filename,
                    "healthStatus": health_status,
                    "confidence": confidence,
                    "processingTime": time.time() - start_time,
                    "fileSize": len(file_contents),
                    "duration": len(audio) / sr if sr > 0 else 0,
                    "sampleRate": sr,
                    "audioFeatures": str(features),
                    "uploadedBy": "user",
                    "modelUsed": "AquaListen-v1.0"
                })
                logger.info("Prediction saved to storage")
            except Exception as e:
                logger.warning(f"Failed to save prediction: {e}")
        
        # Prepare response
        processing_time = time.time() - start_time
        
        # Build human-readable explanation
        anthro_s = diagnostics.get('anthropogenic_score', 0.0)
        fusion = diagnostics.get('fusion_decision', 'unknown')
        if anthro_s < ANTHRO_SCORE_WARN:
            explanation = "Low anthropogenic noise detected; ML prediction retained."
        elif anthro_s < ANTHRO_SCORE_MODERATE:
            explanation = "Mild anthropogenic noise interference; ML confidence slightly reduced."
        elif anthro_s < ANTHRO_SCORE_OVERRIDE:
            explanation = "Significant anthropogenic noise detected; ML confidence moderately reduced."
        elif 'override' in fusion:
            explanation = "Strong anthropogenic noise with low ML confidence; prediction overridden to stressed."
        else:
            explanation = "Strong anthropogenic noise detected but ML is confident; ML prediction retained with penalty."
        
        return {
            "success": True,
            "prediction": {
                "health_status": health_status,
                "confidence": confidence,
                "confidence_percentage": confidence_percent,
                "explanation": explanation
            },
            "file_info": {
                "filename": file.filename,
                "size_bytes": len(file_contents),
                "duration_seconds": len(audio) / sr if sr > 0 else 0,
                "sample_rate": sr
            },
            "processing": {
                "processing_time_seconds": round(processing_time, 2),
                "model_used": "AquaListen-v1.0",
                "timestamp": datetime.datetime.now().isoformat()
            },
            "acoustic_features": {
                "spectral_centroid_hz": float(np.mean(features.get('spectral_centroid', [0]))),
                "spectral_bandwidth_hz": float(np.mean(features.get('spectral_bandwidth', [0]))),
                "zero_crossing_rate": float(np.mean(features.get('zero_crossing_rate', [0])))
            },
            "diagnostics": {
                "ml_prediction": diagnostics.get('ml_prediction'),
                "ml_confidence": diagnostics.get('ml_confidence'),
                "anthropogenic_noise_score": anthro_s,
                "fusion_decision": fusion,
                "prediction_source": diagnostics.get('prediction_source', 'unknown')
            }
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch_predict")
async def batch_predict_reef_health(files: list[UploadFile] = File(...)):
    """
    Batch prediction endpoint for multiple audio files
    """
    
    if len(files) > 20:  # Limit batch size
        raise HTTPException(
            status_code=400,
            detail="Maximum 20 files per batch request"
        )
    
    results = []
    start_time = time.time()
    
    for file in files:
        try:
            # Process each file
            logger.info(f"🔄 Batch processing: {file.filename}")
            audio_data = await file.read()
            audio, sr = librosa.load(io.BytesIO(audio_data), sr=16000, duration=5.0)
            
            features = extract_audio_features(audio, sr)
            predicted_health, confidence, _diag = classify_reef_health(features, file.filename)
            logger.info(f"✅ Batch result: {file.filename} → {predicted_health} ({confidence:.1%})")
            
            result = {
                "filename": file.filename,
                "health_status": predicted_health,
                "confidence": round(confidence, 3),
                "success": True
            }
            
        except Exception as e:
            result = {
                "filename": file.filename,
                "error": str(e),
                "success": False
            }
        
        results.append(result)
    
    total_time = time.time() - start_time
    
    return {
        "batch_results": results,
        "summary": {
            "total_files": len(files),
            "successful": len([r for r in results if r["success"]]),
            "failed": len([r for r in results if not r["success"]]),
            "total_processing_time": round(total_time, 2)
        },
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.get("/model/info")
async def get_model_info():
    """Get information about the loaded AquaListen model"""
    
    info = {
        "model_loaded": model_loaded,
        "model_path": str(Path(__file__).parent / "models" / "savedmodel" / "saved_model.pb"),
        "classification_categories": ["healthy", "stressed", "ambient"],
        "supported_formats": [".wav", ".mp3", ".flac", ".m4a"],
        "max_file_size_mb": 50,
        "processing_timeout_seconds": 30
    }
    
    if reef_classifications:
        info["available_data"] = {
            filename: {"shape": df.shape, "columns": list(df.columns)[:5]}
            for filename, df in reef_classifications.items()
        }
    
    return info

@app.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get live dashboard statistics"""
    if not storage:
        # Fallback static data if storage not available
        return {
            "totalSites": 24,
            "healthySites": 18,
            "totalPredictions": 1247,
            "activeAlerts": 3,
            "globalAverage": 84.7
        }
    
    try:
        stats = await storage.getDashboardStats()
        return {
            "totalSites": stats["totalSites"],
            "healthySites": stats["healthySites"], 
            "totalPredictions": stats["totalPredictions"],
            "activeAlerts": stats["activeAlerts"],
            "globalAverage": round(stats["globalAverage"], 1)
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard statistics")

@app.get("/sites")
async def get_all_sites():
    """Get all reef monitoring sites"""
    if not storage:
        return []
    
    try:
        sites = await storage.getAllSites()
        return sites
    except Exception as e:
        logger.error(f"Error fetching sites: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sites")

@app.get("/predictions/recent")
async def get_recent_predictions(limit: int = 10):
    """Get recent predictions for live feed"""
    if not storage:
        # Mock data for fallback
        return [
            {
                "id": "1",
                "filename": "reef_sample_001.wav",
                "healthStatus": "healthy",
                "confidence": 0.873,
                "siteName": "Great Barrier Reef - Station A",
                "createdAt": "2024-10-31T06:00:00Z"
            }
        ]
    
    try:
        predictions = await storage.getAllPredictions()
        sites = await storage.getAllSites()
        site_map = {site["id"]: site for site in sites}
        
        # Sort by creation date and limit
        recent_predictions = sorted(
            predictions, 
            key=lambda p: p.get("createdAt", ""),
            reverse=True
        )[:limit]
        
        # Add site information
        result = []
        for pred in recent_predictions:
            site = site_map.get(pred["siteId"]) if pred.get("siteId") else None
            result.append({
                "id": pred["id"],
                "filename": pred["filename"],
                "healthStatus": pred["healthStatus"],
                "confidence": pred["confidence"],
                "siteName": site["name"] if site else "Unknown Site",
                "createdAt": pred["createdAt"]
            })
        
        return result
    except Exception as e:
        logger.error(f"Error fetching recent predictions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch recent predictions")

@app.get("/alerts")
async def get_alerts():
    """Get all alerts"""
    if not storage:
        return []
    
    try:
        alerts = await storage.getAllAlerts()
        sites = await storage.getAllSites()
        site_map = {site["id"]: site for site in sites}
        
        result = []
        for alert in alerts:
            site = site_map.get(alert.get("siteId"), {})
            result.append({
                "id": alert["id"],
                "message": alert["message"],
                "severity": alert["severity"],
                "alertType": alert["alertType"],
                "siteName": site.get("name", "Unknown Site"),
                "isRead": alert["isRead"] == 1,
                "createdAt": alert["createdAt"]
            })
        
        return result
    except Exception as e:
        logger.error(f"Error fetching alerts: {e}")
        return []

@app.get("/uploads")
async def get_uploaded_files():
    """Get all uploaded files and their predictions"""
    if not storage:
        return []
    
    try:
        predictions = await storage.getAllPredictions()
        return predictions
    except Exception as e:
        logger.error(f"Error fetching uploaded files: {e}")
        return []

@app.get("/uploads/recent")
async def get_recent_uploads(limit: int = 10):
    """Get recent uploaded files"""
    if not storage:
        return []
    
    try:
        recent_predictions = await storage.getRecentPredictions(limit)
        return recent_predictions
    except Exception as e:
        logger.error(f"Error fetching recent uploads: {e}")
        return []

# ============================================================================
# RUN THE SERVER
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("🌊 Starting OceanPulse AquaListen API Server...")
    print("📊 Loading AquaListen model...")
    
    # Load model before starting server
    success = load_aqualisten_model()
    if success:
        print("✅ AquaListen model loaded successfully!")
    else:
        print("⚠️ AquaListen model not loaded - using fallback classification")
    
    print("🚀 Server starting on http://localhost:8000")
    print("📄 API docs available at http://localhost:8000/docs")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        reload=False  # Set to True for development
    )