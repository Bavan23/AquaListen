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
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Reef site methods
  getAllSites(): Promise<ReefSite[]>;
  getSite(id: string): Promise<ReefSite | undefined>;
  createSite(site: InsertSite): Promise<ReefSite>;
  
  // Prediction methods
  getAllPredictions(): Promise<Prediction[]>;
  getPredictionsBySite(siteId: string): Promise<Prediction[]>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  
  // Alert methods
  getAllAlerts(): Promise<Alert[]>;
  getUnreadAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: string): Promise<void>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalSites: number;
    healthySites: number;
    totalPredictions: number;
    activeAlerts: number;
    globalAverage: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sites: Map<string, ReefSite>;
  private predictions: Map<string, Prediction>;
  private alerts: Map<string, Alert>;

  constructor() {
    this.users = new Map();
    this.sites = new Map();
    this.predictions = new Map();
    this.alerts = new Map();
    
    // Initialize with some sample data for demo
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Create sample reef sites
    const sampleSites = [
      { name: "Great Barrier Reef - Station A", location: "Queensland, Australia", latitude: -16.2839, longitude: 145.7781 },
      { name: "Coral Bay Marine Park", location: "Western Australia", latitude: -23.1394, longitude: 113.7661 },
      { name: "Ningaloo Reef - North", location: "Western Australia", latitude: -21.9333, longitude: 113.9167 },
      { name: "Heron Island Research Station", location: "Queensland, Australia", latitude: -23.4425, longitude: 151.9153 },
      { name: "Lady Elliot Island", location: "Queensland, Australia", latitude: -24.1133, longitude: 152.7153 }
    ];

    sampleSites.forEach(site => {
      const id = randomUUID();
      const reefSite: ReefSite = {
        id,
        ...site,
        status: "active",
        createdAt: new Date()
      };
      this.sites.set(id, reefSite);
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Reef site methods
  async getAllSites(): Promise<ReefSite[]> {
    return Array.from(this.sites.values());
  }

  async getSite(id: string): Promise<ReefSite | undefined> {
    return this.sites.get(id);
  }

  async createSite(insertSite: InsertSite): Promise<ReefSite> {
    const id = randomUUID();
    const site: ReefSite = {
      ...insertSite,
      id,
      status: "active",
      createdAt: new Date(),
      latitude: insertSite.latitude ?? null,
      longitude: insertSite.longitude ?? null
    };
    this.sites.set(id, site);
    return site;
  }

  // Prediction methods
  async getAllPredictions(): Promise<Prediction[]> {
    return Array.from(this.predictions.values());
  }

  async getPredictionsBySite(siteId: string): Promise<Prediction[]> {
    return Array.from(this.predictions.values()).filter(p => p.siteId === siteId);
  }

  async createPrediction(insertPrediction: InsertPrediction): Promise<Prediction> {
    const id = randomUUID();
    const prediction: Prediction = {
      ...insertPrediction,
      id,
      createdAt: new Date(),
      siteId: insertPrediction.siteId ?? null,
      audioFeatures: insertPrediction.audioFeatures ?? null,
      processingTime: insertPrediction.processingTime ?? null
    };
    this.predictions.set(id, prediction);

    // Auto-create alert if stressed reef detected
    if (prediction.healthStatus === 'stressed' && prediction.confidence > 0.7) {
      await this.createAlert({
        siteId: prediction.siteId!,
        predictionId: id,
        alertType: 'stress_detected',
        message: `Reef stress detected at ${prediction.confidence * 100}% confidence`,
        severity: 'high'
      });
    }

    return prediction;
  }

  // Alert methods
  async getAllAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }

  async getUnreadAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => alert.isRead === 0);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = {
      ...insertAlert,
      id,
      isRead: 0,
      createdAt: new Date(),
      siteId: insertAlert.siteId ?? null,
      predictionId: insertAlert.predictionId ?? null,
      severity: insertAlert.severity ?? "medium"
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async markAlertAsRead(id: string): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.isRead = 1;
      this.alerts.set(id, alert);
    }
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalSites: number;
    healthySites: number;
    totalPredictions: number;
    activeAlerts: number;
    globalAverage: number;
  }> {
    const allSites = await this.getAllSites();
    const allPredictions = await this.getAllPredictions();
    const unreadAlerts = await this.getUnreadAlerts();

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

export const storage = new MemStorage();
