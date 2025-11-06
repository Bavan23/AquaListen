# 🌊 AquaListen - Coral Reef Health Monitoring System

**Advanced AI-powered coral reef health monitoring through acoustic analysis**

AquaListen is a cutting-edge marine conservation tool that uses machine learning to analyze underwater audio recordings and assess coral reef ecosystem health. Our system provides real-time insights into reef biodiversity and stress levels, enabling proactive conservation efforts.

## 🎯 Features

- **🎵 Audio Analysis**: Process underwater recordings to detect marine life patterns
- **🤖 AI Classification**: Custom-trained neural network for reef health assessment  
- **📊 Real-time Dashboard**: Interactive web interface with live monitoring
- **🗺️ Site Management**: Track multiple reef locations and monitoring sites
- **📈 Batch Processing**: Analyze large datasets efficiently
- **🚨 Alert System**: Automated notifications for reef stress detection

## 🏗️ Architecture

### Machine Learning Pipeline
- **Training Dataset**: 57,000 audio samples from ReefSet v1.0
- **Model Architecture**: Deep neural network with feature extraction
- **Performance**: 82.3% accuracy on reef health classification
- **Categories**: Healthy, Stressed, Ambient water conditions

### Technology Stack
- **Backend**: FastAPI + TensorFlow + Librosa
- **Frontend**: React + TypeScript + Tailwind CSS
- **Audio Processing**: 16kHz sampling, 10-second segments
- **Deployment**: Docker-ready with TensorFlow SavedModel

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- 4GB+ RAM for model inference

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/AquaListen.git
   cd AquaListen
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Node.js dependencies**
   ```bash
   cd app
   npm install
   ```

4. **Start the system**
   ```bash
   # Start API server
   python aqualisten_api.py
   
   # Start frontend (new terminal)
   cd app
   npm run dev
   ```

5. **Access the application**
   - Web Interface: http://localhost:3000
   - API Documentation: http://localhost:8000/docs

## 📊 Model Performance

| Metric | Score |
|--------|-------|
| **Accuracy** | 82.3% |
| **Precision** | 81.9% |
| **Recall** | 82.5% |
| **F1-Score** | 82.2% |

**Training Data**: 57,000 marine audio samples
**Categories**: Healthy (32k), Stressed (18k), Ambient (7k)

## 🎵 Supported Audio Formats

- WAV (recommended)
- MP3
- FLAC  
- M4A

**Optimal Settings**: 16kHz sample rate, 10-second duration

## 📱 Usage

### Single File Analysis
1. Navigate to Upload page
2. Select audio file (.wav, .mp3, .flac, .m4a)
3. Click "Analyze" to get reef health assessment
4. View confidence scores and acoustic features

### Batch Processing
1. Go to Batch Processing page
2. Upload multiple files (max 20 per batch)
3. Monitor processing progress
4. Download results as CSV

### Site Monitoring
1. Add monitoring sites in Sites page
2. Upload regular recordings for each site
3. Track health trends over time
4. Set up automated alerts

## 🔬 Technical Details

### Audio Feature Extraction
- Spectral centroid and bandwidth
- Zero-crossing rate analysis
- 13 MFCC coefficients
- Energy distribution patterns

### Health Classification Logic
- **Healthy**: High biodiversity, complex acoustic patterns
- **Stressed**: Reduced acoustic complexity, mechanical noise
- **Ambient**: Background ocean sounds, minimal biological activity

## 🌊 Marine Conservation Impact

AquaListen supports coral reef conservation by:
- **Early Detection**: Identify reef stress before visual degradation
- **Non-invasive Monitoring**: No physical disturbance to marine life
- **Scalable Assessment**: Monitor large areas cost-effectively
- **Data-driven Decisions**: Provide quantitative health metrics

## 🤝 Contributing

We welcome contributions to improve AquaListen:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- ReefSet v1.0 dataset for training data
- Marine biology research community
- Open source audio processing libraries
- Coral reef conservation organizations

## 📞 Contact

- **Project Lead**: [Bavan]
- **Email**: [bavan2312@gmail.com]
- **Website**: [https://aqualisten.org](https://aqualisten.org)

---

**🌊 Protecting coral reefs through innovative acoustic monitoring technology**
=======
# AquaListen
>>>>>>> cca050c7b37141d0be639c549cd27dcf3cb6d49e
