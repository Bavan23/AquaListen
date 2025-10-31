import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Database, 
  FileText, 
  Clock, 
  HardDrive,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ModelInfo {
  model_path?: string;
  model_name?: string;
  version?: string;
  supported_formats?: string[];
  max_file_size_mb?: number;
  processing_timeout_seconds?: number;
  sample_rate?: number;
  model_loaded?: boolean;
  performance_metrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
  };
  training_data?: {
    total_samples?: number;
    healthy_samples?: number;
    stressed_samples?: number;
    ambient_samples?: number;
  };
}

export default function ModelInfo() {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);

  const fetchModelInfo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: remove mock functionality - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock API response
      const mockModelInfo: ModelInfo = {
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

      // Mock CSV data preview
      const mockCsvData = [
        { id: 1, filename: 'reef_001.wav', health: 'healthy', confidence: 0.923, site: 'GBR-A' },
        { id: 2, filename: 'reef_002.wav', health: 'stressed', confidence: 0.789, site: 'CB-B' },
        { id: 3, filename: 'reef_003.wav', health: 'ambient', confidence: 0.856, site: 'NR-C' },
        { id: 4, filename: 'reef_004.wav', health: 'healthy', confidence: 0.934, site: 'HI-D' },
        { id: 5, filename: 'reef_005.wav', health: 'stressed', confidence: 0.723, site: 'LI-E' }
      ];

      setModelInfo(mockModelInfo);
      setCsvData(mockCsvData);
      
    } catch (err) {
      setError('Failed to fetch model information');
      console.error('Model info fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6" data-testid="page-model-info-loading">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Model Information</h1>
            <p className="text-muted-foreground mt-1">Loading model details...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Fetching model information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6" data-testid="page-model-info-error">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Model Information</h1>
            <p className="text-muted-foreground mt-1">Error loading model details</p>
          </div>
          <Button onClick={fetchModelInfo} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!modelInfo) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="page-model-info">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Model Information</h1>
          <p className="text-muted-foreground mt-1">
            Detailed information about the reef health prediction model
          </p>
        </div>
        <Button onClick={fetchModelInfo} variant="outline" data-testid="button-refresh">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Model Status */}
      <Alert className={modelInfo.model_loaded ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        {modelInfo.model_loaded ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
        <AlertDescription>
          <strong>Model Status:</strong> {modelInfo.model_loaded ? 'Loaded and Ready' : 'Not Loaded'}
          {!modelInfo.model_loaded && (
            <span className="block mt-1 text-sm">
              The model is not currently loaded. Contact an administrator to load the model for predictions.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Basic Information */}
      <Card data-testid="card-basic-info">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>Basic Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Model Name</h4>
                <p className="text-lg font-semibold" data-testid="text-model-name">
                  {modelInfo.model_name} v{modelInfo.version}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Model Path</h4>
                <p className="font-mono text-sm" data-testid="text-model-path">
                  {modelInfo.model_path}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Supported Formats</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {modelInfo.supported_formats?.map(format => (
                    <Badge key={format} variant="outline" data-testid={`badge-format-${format}`}>
                      {format}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Processing Limits</h4>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Max File Size: {modelInfo.max_file_size_mb} MB</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Timeout: {modelInfo.processing_timeout_seconds}s</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Sample Rate: {modelInfo.sample_rate}Hz</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {modelInfo.performance_metrics && (
        <Card data-testid="card-performance">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(modelInfo.performance_metrics.accuracy! * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
                <Progress value={modelInfo.performance_metrics.accuracy! * 100} className="mt-2" />
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {(modelInfo.performance_metrics.precision! * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Precision</div>
                <Progress value={modelInfo.performance_metrics.precision! * 100} className="mt-2" />
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(modelInfo.performance_metrics.recall! * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Recall</div>
                <Progress value={modelInfo.performance_metrics.recall! * 100} className="mt-2" />
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(modelInfo.performance_metrics.f1_score! * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">F1 Score</div>
                <Progress value={modelInfo.performance_metrics.f1_score! * 100} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Data */}
      {modelInfo.training_data && (
        <Card data-testid="card-training-data">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Training Dataset</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{modelInfo.training_data.total_samples?.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Samples</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{modelInfo.training_data.healthy_samples?.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Healthy</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{modelInfo.training_data.stressed_samples?.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Stressed</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{modelInfo.training_data.ambient_samples?.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Ambient</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Data Preview */}
      <Card data-testid="card-sample-data">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Sample Data Preview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Filename</th>
                  <th className="text-left p-2">Health Status</th>
                  <th className="text-left p-2">Confidence</th>
                  <th className="text-left p-2">Site</th>
                </tr>
              </thead>
              <tbody>
                {csvData.slice(0, 5).map(row => (
                  <tr key={row.id} className="border-b" data-testid={`row-sample-${row.id}`}>
                    <td className="p-2">{row.id}</td>
                    <td className="p-2 font-mono text-xs">{row.filename}</td>
                    <td className="p-2">
                      <Badge 
                        className={
                          row.health === 'healthy' ? 'bg-green-100 text-green-800' :
                          row.health === 'stressed' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }
                      >
                        {row.health}
                      </Badge>
                    </td>
                    <td className="p-2">{(row.confidence * 100).toFixed(1)}%</td>
                    <td className="p-2">{row.site}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-3 bg-muted rounded text-sm text-muted-foreground">
            <Info className="w-4 h-4 inline mr-2" />
            Showing first 5 rows of sample data. Full dataset contains {csvData.length} entries.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}