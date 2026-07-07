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

  // Audio prediction endpoint — proxy to Python ML backend
  app.post('/predict', async (req, res) => {
    try {
      // Forward the entire request to the Python FastAPI ML backend
      const pythonUrl = 'http://localhost:8000/predict';

      // Re-assemble the multipart body from Express and forward it
      // Since Express may have already parsed the body, we pipe the raw request
      const fetch = (await import('node-fetch')).default;
      const FormData = (await import('form-data')).default;

      // If multer or similar parsed the file, reconstruct FormData
      // Otherwise, pipe the raw request through
      const headers: Record<string, string> = {};
      if (req.headers['content-type']) {
        headers['content-type'] = req.headers['content-type'] as string;
      }

      // Pipe the raw request body to the Python backend
      const proxyResponse = await fetch(pythonUrl, {
        method: 'POST',
        headers,
        body: req,
      });

      const data = await proxyResponse.json();

      if (!proxyResponse.ok) {
        res.status(proxyResponse.status).json(data);
        return;
      }

      res.json(data);
    } catch (error) {
      console.error('❌ Failed to proxy predict to Python:', error);
      res.status(502).json({ 
        success: false,
        detail: 'ML backend (Python :8000) is unavailable. Ensure the FastAPI server is running.' 
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

      // NOTE: Alert creation is handled inside MongoStorage.createPrediction()
      // Do NOT create alerts here — that caused duplicate alerts.

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
