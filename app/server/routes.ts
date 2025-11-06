import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed-data";
import { addDynamicData } from "./add-dynamic-data";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Frontend expects these exact endpoints on port 8000
  // Health check endpoint (matches frontend expectation)
  app.get('/health', async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json({ 
        status: 'healthy', 
        database: 'connected',
        stats 
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'error', 
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Dashboard stats endpoint (matches frontend expectation)
  app.get('/dashboard/stats', async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Sites endpoint (matches frontend expectation)
  app.get('/sites', async (req, res) => {
    try {
      const sites = await storage.getAllSites();
      res.json(sites);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Recent predictions endpoint (matches frontend expectation)
  app.get('/predictions/recent', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const predictions = await storage.getAllPredictions();
      
      // Transform predictions to match frontend RecentPrediction interface
      const sites = await storage.getAllSites();
      const recentPredictions = predictions
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
        .slice(0, limit)
        .map(pred => {
          const site = sites.find(s => s.id === pred.siteId);
          return {
            id: pred.id,
            filename: pred.filename,
            healthStatus: pred.healthStatus as 'healthy' | 'stressed' | 'ambient',
            confidence: pred.confidence,
            siteName: site?.name || 'Unknown Site',
            createdAt: pred.createdAt?.toISOString() || new Date().toISOString()
          };
        });
      
      res.json(recentPredictions);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Alerts endpoint (matches frontend expectation)
  app.get('/alerts', async (req, res) => {
    try {
      const alerts = await storage.getUnreadAlerts();
      const sites = await storage.getAllSites();
      
      // Transform alerts to match frontend Alert interface
      const transformedAlerts = alerts.map(alert => {
        const site = sites.find(s => s.id === alert.siteId);
        return {
          id: alert.id,
          message: alert.message,
          severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
          alertType: alert.alertType,
          siteName: site?.name || 'Unknown Site',
          isRead: alert.isRead === 1,
          createdAt: alert.createdAt?.toISOString() || new Date().toISOString()
        };
      });
      
      res.json(transformedAlerts);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Model info endpoint (matches frontend expectation)
  app.get('/model/info', async (req, res) => {
    try {
      // Mock model info for now - replace with real data later
      const modelInfo = {
        model_path: '/models/aqualisten-v1.0.pkl',
        model_name: 'AquaListen',
        version: '1.0.0',
        supported_formats: ['.wav', '.mp3', '.m4a', '.flac'],
        max_file_size_mb: 100,
        processing_timeout_seconds: 120,
        sample_rate: 44100,
        model_loaded: true,
        performance_metrics: {
          accuracy: 0.823,
          precision: 0.819,
          recall: 0.825,
          f1_score: 0.822
        },
        training_data: {
          total_samples: 57000,
          healthy_samples: 32000,
          stressed_samples: 18000,
          ambient_samples: 7000
        }
      };
      res.json(modelInfo);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Audio prediction endpoint (matches frontend expectation)
  app.post('/predict', async (req, res) => {
    try {
      // For now, create a sample prediction to test the database
      // Later this will process the actual audio file
      const samplePrediction = await storage.createPrediction({
        filename: `uploaded_${Date.now()}.wav`,
        healthStatus: Math.random() > 0.5 ? 'healthy' : 'stressed',
        confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
        siteId: null,
        audioFeatures: JSON.stringify({ 
          spectral_centroid: Math.random() * 1000,
          mfcc_mean: Math.random() * 10 
        }),
        processingTime: Math.random() * 5 + 2 // 2-7 seconds
      });
      
      // Return in format expected by frontend
      res.json({
        success: true,
        prediction: {
          health_status: samplePrediction.healthStatus,
          confidence: samplePrediction.confidence,
          processing_time: samplePrediction.processingTime,
          audio_features: JSON.parse(samplePrediction.audioFeatures || '{}')
        },
        filename: samplePrediction.filename,
        timestamp: samplePrediction.createdAt
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        detail: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Seed database endpoint (for testing and initial setup)
  app.post('/seed-database', async (req, res) => {
    try {
      console.log('🌱 Seeding database via API...');
      const result = await seedDatabase();
      res.json({
        success: true,
        message: 'Database seeded successfully!',
        data: result
      });
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add dynamic data endpoint (for increasing dashboard numbers)
  app.post('/add-dynamic-data', async (req, res) => {
    try {
      console.log('📈 Adding dynamic data via API...');
      const result = await addDynamicData();
      res.json({
        success: true,
        message: 'Dynamic data added successfully!',
        data: result
      });
    } catch (error) {
      console.error('❌ Adding dynamic data failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // API endpoint for Python backend to save predictions
  app.post('/api/predictions', async (req, res) => {
    try {
      console.log('🐍 Receiving prediction from Python API...');
      const predictionData = req.body;
      
      const prediction = await storage.createPrediction({
        siteId: predictionData.siteId,
        filename: predictionData.filename,
        healthStatus: predictionData.healthStatus as 'healthy' | 'stressed' | 'ambient',
        confidence: predictionData.confidence,
        audioFeatures: predictionData.audioFeatures || '{}',
        processingTime: predictionData.processingTime || 0
      });

      // Create alert if stressed reef detected
      if (predictionData.healthStatus === 'stressed' && predictionData.confidence > 0.7) {
        await storage.createAlert({
          siteId: predictionData.siteId,
          predictionId: prediction.id,
          alertType: 'stress_detected',
          message: `Reef stress detected in ${predictionData.filename} with ${(predictionData.confidence * 100).toFixed(1)}% confidence`,
          severity: predictionData.confidence > 0.8 ? 'high' : 'medium',
          isRead: 0
        });
        console.log('🚨 Alert created for stressed reef');
      }

      res.json({
        success: true,
        prediction,
        message: 'Prediction saved successfully'
      });
    } catch (error) {
      console.error('❌ Failed to save prediction from Python:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
