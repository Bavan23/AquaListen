// AquaListen API Service
const API_BASE_URL = 'http://localhost:8000';

export interface DashboardStats {
  totalSites: number;
  healthySites: number;
  totalPredictions: number;
  activeAlerts: number;
  globalAverage: number;
}

export interface ReefSite {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  status: string;
  createdAt: string;
  // Computed fields for map display
  region?: string;
  lastHealth?: 'healthy' | 'stressed' | 'ambient';
  lastConfidence?: number;
  lastUpdated?: string;
  lat?: number; // Alias for latitude
  lng?: number; // Alias for longitude
}

export interface RecentPrediction {
  id: string;
  filename: string;
  healthStatus: 'healthy' | 'stressed' | 'ambient';
  confidence: number;
  siteName: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  alertType: string;
  siteName: string;
  isRead: boolean;
  createdAt: string;
}

class ApiService {
  private async fetchApi<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch ${endpoint}:`, error);
      throw error;
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.fetchApi<DashboardStats>('/dashboard/stats');
  }

  async getAllSites(): Promise<ReefSite[]> {
    return this.fetchApi<ReefSite[]>('/sites');
  }

  async getSites(): Promise<ReefSite[]> {
    const sites = await this.getAllSites();
    const predictions = await this.getRecentPredictions(50); // Get more predictions for site analysis
    
    // Enhance sites with computed data
    return sites.map(site => {
      // Find most recent prediction for this site
      const sitePredictions = predictions.filter(p => p.siteName === site.name);
      const recentPrediction = sitePredictions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      return {
        ...site,
        region: site.location, // Use location as region
        lastHealth: recentPrediction?.healthStatus || 'ambient',
        lastConfidence: recentPrediction ? recentPrediction.confidence * 100 : 75,
        lastUpdated: recentPrediction?.createdAt || site.createdAt,
        lat: site.latitude,
        lng: site.longitude,
      };
    });
  }

  async getRecentPredictions(limit: number = 10): Promise<RecentPrediction[]> {
    return this.fetchApi<RecentPrediction[]>(`/predictions/recent?limit=${limit}`);
  }

  async getAllAlerts(): Promise<Alert[]> {
    return this.fetchApi<Alert[]>('/alerts');
  }

  async uploadAudio(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to upload audio:', error);
      throw error;
    }
  }

  async getModelInfo(): Promise<any> {
    return this.fetchApi<any>('/model/info');
  }

  async checkHealth(): Promise<any> {
    return this.fetchApi<any>('/health');
  }
}

export const apiService = new ApiService();
