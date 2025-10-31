import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService, type DashboardStats as ApiDashboardStats, type RecentPrediction } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardStats as DashboardStatsComponent } from '@/components/DashboardStats';
import { HealthStatusCard } from '@/components/HealthStatusCard';
import { QuickUploadModal } from '@/components/QuickUploadModal';
import { ModelStatusBanner } from '@/components/ModelStatusBanner';
import { ConfidenceGauge } from '@/components/ConfidenceGauge';
import { AlertCard } from '@/components/AlertCard';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Upload, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import heroImage from '@assets/generated_images/Healthy_coral_reef_hero_4141e0bb.png';

export default function Dashboard() {
  const [modelStatus, setModelStatus] = useState<'loaded' | 'loading' | 'error'>('loaded');

  // Fetch live dashboard data
  const { data: dashboardStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => apiService.getDashboardStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  const { data: recentPredictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ['recentPredictions'],
    queryFn: () => apiService.getRecentPredictions(5),
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // TODO: remove mock functionality - replace with real data (keeping for trend chart)
  const mockTrendData = [
    { date: '2024-01-01', healthy: 65, stressed: 25, ambient: 10, avgConfidence: 78 },
    { date: '2024-01-05', healthy: 70, stressed: 20, ambient: 10, avgConfidence: 82 },
    { date: '2024-01-10', healthy: 68, stressed: 22, ambient: 10, avgConfidence: 80 },
    { date: '2024-01-15', healthy: 72, stressed: 18, ambient: 10, avgConfidence: 85 },
    { date: '2024-01-20', healthy: 75, stressed: 15, ambient: 10, avgConfidence: 87 },
    { date: '2024-01-25', healthy: 73, stressed: 17, ambient: 10, avgConfidence: 84 },
    { date: '2024-01-30', healthy: 76, stressed: 14, ambient: 10, avgConfidence: 88 }
  ];

  const mockRecentPredictions = [
    {
      id: '1',
      filename: 'reef_sample_001.wav',
      site: 'Great Barrier Reef - Station A',
      status: 'healthy' as const,
      confidence: 87.3,
      timestamp: '2024-01-15T10:30:00Z'
    },
    {
      id: '2', 
      filename: 'coral_audio_024.mp3',
      site: 'Ningaloo Reef - Station C',
      status: 'stressed' as const,
      confidence: 73.1,
      timestamp: '2024-01-15T09:15:00Z'
    },
    {
      id: '3',
      filename: 'ocean_background.wav',
      status: 'ambient' as const,
      confidence: 91.7,
      timestamp: '2024-01-15T08:45:00Z'
    }
  ];

  const mockRecentAlerts = [
    {
      id: '1',
      severity: 'critical' as const,
      title: 'Low Confidence Alert',
      message: 'Confidence dropped below 50% threshold',
      site: 'Coral Bay - Station B',
      confidence: 42.3,
      timestamp: '2024-01-15T10:30:00Z',
      resolved: false
    },
    {
      id: '2',
      severity: 'warning' as const,
      title: 'Model Performance',
      message: 'Processing time increased by 40%',
      timestamp: '2024-01-15T09:15:00Z',
      resolved: false
    }
  ];

  const handleQuickUpload = (data: any) => {
    console.log('Quick upload:', data);
    // TODO: Process upload
  };

  const handleRetryModel = () => {
    console.log('Retrying model load...');
    setModelStatus('loading');
    setTimeout(() => setModelStatus('loaded'), 2000);
  };

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <ModelStatusBanner 
        isModelLoaded={modelStatus === 'loaded'}
        isLoading={modelStatus === 'loading'}
        error={modelStatus === 'error' ? 'Connection timeout' : undefined}
        onRetry={handleRetryModel}
      />

      {/* Hero Section */}
      <div 
        className="relative rounded-lg overflow-hidden bg-gradient-to-r from-blue-600 to-teal-500 text-white"
        style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.8), rgba(20, 184, 166, 0.8)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Reef Health Monitoring</h1>
              <p className="text-blue-100 mb-4">
                AI-powered acoustic analysis for marine conservation
              </p>
              <div className="flex items-center space-x-4">
                <Badge className="bg-white/20 text-white border-white/30">
                  Real-time Analysis
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30">
                  24 Active Sites
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <QuickUploadModal onUpload={handleQuickUpload} />
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                onClick={() => {
                  refetchStats();
                  // Also refresh predictions
                  window.location.reload(); // Simple refresh for now
                }}
                disabled={statsLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <DashboardStatsComponent 
        stats={dashboardStats}
        isLoading={statsLoading}
        onRefresh={refetchStats}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Predictions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Feed */}
          <Card data-testid="card-live-feed">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Live Predictions Feed</span>
                </CardTitle>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {predictionsLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading recent predictions...
                </div>
              ) : recentPredictions && recentPredictions.length > 0 ? (
                recentPredictions.map(prediction => (
                  <HealthStatusCard
                    key={prediction.id}
                    status={prediction.healthStatus}
                    confidence={prediction.confidence * 100}
                    filename={prediction.filename}
                    site={prediction.siteName}
                    timestamp={prediction.createdAt}
                  />
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No recent predictions available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trend Charts */}
          <Card data-testid="card-trends">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>30-Day Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Health Distribution */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Health Status Distribution</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={mockTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="healthy" 
                        stackId="1" 
                        stroke="hsl(var(--chart-2))" 
                        fill="hsl(var(--chart-2))" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="stressed" 
                        stackId="1" 
                        stroke="hsl(var(--chart-3))" 
                        fill="hsl(var(--chart-3))" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="ambient" 
                        stackId="1" 
                        stroke="hsl(var(--chart-1))" 
                        fill="hsl(var(--chart-1))" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Confidence Trends */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Average Confidence</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={mockTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[60, 100]} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="avgConfidence" 
                        stroke="hsl(var(--chart-1))" 
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Current Status */}
          <ConfidenceGauge
            confidence={84.7}
            previousConfidence={81.3}
            label="Global Average"
            showTrend={true}
            size="lg"
          />

          {/* Recent Alerts */}
          <Card data-testid="card-recent-alerts">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Alerts</CardTitle>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockRecentAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  {...alert}
                  onResolve={(id) => console.log('Resolve alert:', id)}
                  onDismiss={(id) => console.log('Dismiss alert:', id)}
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}