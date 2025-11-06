import { 
  type User, 
  type InsertUser,
  type ReefSite,
  type InsertSite,
  type Prediction,
  type InsertPrediction,
  type Alert,
  type InsertAlert
} from "@shared/schema";
import { connectToDatabase } from "./database";
import { User as UserModel, ReefSite as ReefSiteModel, Prediction as PredictionModel, Alert as AlertModel } from "./models";
import type { IStorage } from "./storage";

export class MongoStorage implements IStorage {
  private initialized = false;

  private async ensureConnection() {
    if (!this.initialized) {
      await connectToDatabase();
      await this.initializeSampleData();
      this.initialized = true;
    }
  }

  private async initializeSampleData() {
    try {
      // Check if sample data already exists
      const existingSites = await ReefSiteModel.countDocuments();
      if (existingSites > 0) {
        return; // Sample data already exists
      }

      // Create sample reef sites
      const sampleSites = [
        { name: "Great Barrier Reef - Station A", location: "Queensland, Australia", latitude: -16.2839, longitude: 145.7781 },
        { name: "Coral Bay Marine Park", location: "Western Australia", latitude: -23.1394, longitude: 113.7661 },
        { name: "Ningaloo Reef - North", location: "Western Australia", latitude: -21.9333, longitude: 113.9167 },
        { name: "Heron Island Research Station", location: "Queensland, Australia", latitude: -23.4425, longitude: 151.9153 },
        { name: "Lady Elliot Island", location: "Queensland, Australia", latitude: -24.1133, longitude: 152.7153 }
      ];

      await ReefSiteModel.insertMany(sampleSites.map(site => ({
        ...site,
        status: "active"
      })));

      console.log('✅ Sample reef sites initialized in MongoDB');
    } catch (error) {
      console.error('❌ Error initializing sample data:', error);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    await this.ensureConnection();
    const user = await UserModel.findById(id).lean() as any;
    return user ? { 
      id: user._id.toString(),
      username: user.username,
      password: user.password
    } : undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureConnection();
    const user = await UserModel.findOne({ username }).lean() as any;
    return user ? { 
      id: user._id.toString(),
      username: user.username,
      password: user.password
    } : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureConnection();
    const user = new UserModel(insertUser);
    const savedUser = await user.save();
    return { 
      id: savedUser._id.toString(),
      username: savedUser.username,
      password: savedUser.password
    };
  }

  // Reef site methods
  async getAllSites(): Promise<ReefSite[]> {
    await this.ensureConnection();
    const sites = await ReefSiteModel.find().lean() as any[];
    return sites.map(site => ({
      id: site._id.toString(),
      name: site.name,
      location: site.location,
      latitude: site.latitude || null,
      longitude: site.longitude || null,
      status: site.status,
      createdAt: site.createdAt || null
    }));
  }

  async getSite(id: string): Promise<ReefSite | undefined> {
    await this.ensureConnection();
    const site = await ReefSiteModel.findById(id).lean() as any;
    return site ? {
      id: site._id.toString(),
      name: site.name,
      location: site.location,
      latitude: site.latitude || null,
      longitude: site.longitude || null,
      status: site.status,
      createdAt: site.createdAt || null
    } : undefined;
  }

  async createSite(insertSite: InsertSite): Promise<ReefSite> {
    await this.ensureConnection();
    const site = new ReefSiteModel({
      ...insertSite,
      status: "active",
      latitude: insertSite.latitude ?? null,
      longitude: insertSite.longitude ?? null
    });
    const savedSite = await site.save();
    return { ...savedSite.toObject(), id: savedSite._id.toString() } as ReefSite;
  }

  // Prediction methods
  async getAllPredictions(): Promise<Prediction[]> {
    await this.ensureConnection();
    const predictions = await PredictionModel.find().lean() as any[];
    return predictions.map(pred => ({ 
      id: pred._id.toString(),
      siteId: pred.siteId?.toString() || null,
      filename: pred.filename,
      healthStatus: pred.healthStatus,
      confidence: pred.confidence,
      audioFeatures: pred.audioFeatures || null,
      processingTime: pred.processingTime || null,
      createdAt: pred.createdAt || null
    }));
  }

  async getPredictionsBySite(siteId: string): Promise<Prediction[]> {
    await this.ensureConnection();
    const predictions = await PredictionModel.find({ siteId }).lean() as any[];
    return predictions.map(pred => ({ 
      id: pred._id.toString(),
      siteId: pred.siteId?.toString() || null,
      filename: pred.filename,
      healthStatus: pred.healthStatus,
      confidence: pred.confidence,
      audioFeatures: pred.audioFeatures || null,
      processingTime: pred.processingTime || null,
      createdAt: pred.createdAt || null
    }));
  }

  async createPrediction(insertPrediction: InsertPrediction): Promise<Prediction> {
    await this.ensureConnection();
    const prediction = new PredictionModel({
      ...insertPrediction,
      siteId: insertPrediction.siteId || null,
      audioFeatures: insertPrediction.audioFeatures || null,
      processingTime: insertPrediction.processingTime || null
    });
    const savedPrediction = await prediction.save();

    // Auto-create alert if stressed reef detected
    if (savedPrediction.healthStatus === 'stressed' && savedPrediction.confidence > 0.7) {
      await this.createAlert({
        siteId: savedPrediction.siteId?.toString() || null,
        predictionId: savedPrediction._id.toString(),
        alertType: 'stress_detected',
        message: `Reef stress detected at ${savedPrediction.confidence * 100}% confidence`,
        severity: 'high'
      });
    }

    return { 
      id: savedPrediction._id.toString(),
      siteId: savedPrediction.siteId?.toString() || null,
      filename: savedPrediction.filename,
      healthStatus: savedPrediction.healthStatus,
      confidence: savedPrediction.confidence,
      audioFeatures: savedPrediction.audioFeatures || null,
      processingTime: savedPrediction.processingTime || null,
      createdAt: savedPrediction.createdAt || null
    };
  }

  // Alert methods
  async getAllAlerts(): Promise<Alert[]> {
    await this.ensureConnection();
    const alerts = await AlertModel.find().lean() as any[];
    return alerts.map(alert => ({ 
      id: alert._id.toString(),
      siteId: alert.siteId?.toString() || null,
      predictionId: alert.predictionId?.toString() || null,
      alertType: alert.alertType,
      message: alert.message,
      severity: alert.severity,
      isRead: alert.isRead,
      createdAt: alert.createdAt || null
    }));
  }

  async getUnreadAlerts(): Promise<Alert[]> {
    await this.ensureConnection();
    const alerts = await AlertModel.find({ isRead: 0 }).lean() as any[];
    return alerts.map(alert => ({ 
      id: alert._id.toString(),
      siteId: alert.siteId?.toString() || null,
      predictionId: alert.predictionId?.toString() || null,
      alertType: alert.alertType,
      message: alert.message,
      severity: alert.severity,
      isRead: alert.isRead,
      createdAt: alert.createdAt || null
    }));
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    await this.ensureConnection();
    const alert = new AlertModel({
      ...insertAlert,
      isRead: 0,
      siteId: insertAlert.siteId || null,
      predictionId: insertAlert.predictionId || null,
      severity: insertAlert.severity || "medium"
    });
    const savedAlert = await alert.save();
    return { 
      ...savedAlert.toObject(), 
      id: savedAlert._id.toString(),
      siteId: savedAlert.siteId?.toString() || null,
      predictionId: savedAlert.predictionId?.toString() || null
    } as Alert;
  }

  async markAlertAsRead(id: string): Promise<void> {
    await this.ensureConnection();
    await AlertModel.findByIdAndUpdate(id, { isRead: 1 });
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalSites: number;
    healthySites: number;
    totalPredictions: number;
    activeAlerts: number;
    globalAverage: number;
  }> {
    await this.ensureConnection();
    
    const [allSites, allPredictions, unreadAlerts] = await Promise.all([
      this.getAllSites(),
      this.getAllPredictions(),
      this.getUnreadAlerts()
    ]);

    // Calculate healthy sites based on recent predictions
    const healthySites = allSites.filter(site => {
      const sitePredictions = allPredictions
        .filter(p => p.siteId === site.id)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
      
      const recentPrediction = sitePredictions[0];
      return recentPrediction?.healthStatus === 'healthy';
    }).length;

    // Calculate global average confidence
    const totalConfidence = allPredictions.reduce((sum, p) => sum + p.confidence, 0);
    const globalAverage = allPredictions.length > 0 ? totalConfidence / allPredictions.length : 0;

    return {
      totalSites: allSites.length,
      healthySites,
      totalPredictions: allPredictions.length,
      activeAlerts: unreadAlerts.length,
      globalAverage: globalAverage * 100 // Convert to percentage
    };
  }
}
