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
import { apiService } from '@/lib/api';

// Matches the shape returned by GET :8000/model/info
interface ModelInfoData {
  model_loaded?: boolean;
  model_path?: string;
  classification_categories?: string[];
  supported_formats?: string[];
  max_file_size_mb?: number;
  processing_timeout_seconds?: number;
  available_data?: Record<string, { shape: [number, number]; columns: string[] }>;
  // Cached model signature info
  model_signature?: Record<string, { inputs: string; outputs: string }>;
}

export default function ModelInfo() {
  const [modelInfo, setModelInfo] = useState<ModelInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModelInfo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiService.getModelInfo();
      setModelInfo(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to connect to ML backend: ${err.message}`
          : 'Failed to fetch model information'
      );
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
            <p>Fetching model information from ML backend...</p>
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
            Live information from the AquaListen ML backend
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
          <strong>Model Status:</strong> {modelInfo.model_loaded ? 'Loaded and Ready' : 'Not Loaded — using fallback classification'}
          {!modelInfo.model_loaded && (
            <span className="block mt-1 text-sm">
              The TensorFlow SavedModel could not be loaded. The API will use fallback heuristic classification.
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
                  AquaListen (Google SurfPerch)
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Model Path</h4>
                <p className="font-mono text-sm break-all" data-testid="text-model-path">
                  {modelInfo.model_path || 'N/A'}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground">Classification Categories</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {modelInfo.classification_categories?.map(cat => (
                    <Badge
                      key={cat}
                      className={
                        cat === 'healthy' ? 'bg-green-100 text-green-800' :
                        cat === 'stressed' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
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
                    <span className="text-sm">Max File Size: {modelInfo.max_file_size_mb ?? 'N/A'} MB</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Timeout: {modelInfo.processing_timeout_seconds ?? 'N/A'}s</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Input: 10s @ 16 kHz (160,000 samples)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available CSV Data */}
      {modelInfo.available_data && Object.keys(modelInfo.available_data).length > 0 && (
        <Card data-testid="card-csv-data">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span>Loaded Classification Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">CSV File</th>
                    <th className="text-left p-2">Rows</th>
                    <th className="text-left p-2">Columns</th>
                    <th className="text-left p-2">Sample Columns</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(modelInfo.available_data).map(([filename, info]) => (
                    <tr key={filename} className="border-b" data-testid={`row-csv-${filename}`}>
                      <td className="p-2 font-mono text-xs">{filename}</td>
                      <td className="p-2">{info.shape[0].toLocaleString()}</td>
                      <td className="p-2">{info.shape[1]}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {info.columns.map(col => (
                            <Badge key={col} variant="outline" className="text-xs">
                              {col}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded text-sm text-muted-foreground">
              <Info className="w-4 h-4 inline mr-2" />
              These CSVs are loaded at startup for taxonomy mapping. The primary model is Google SurfPerch (EfficientNet-B0, 10,932 species classes).
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Architecture Note */}
      <Card data-testid="card-architecture">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Architecture Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">Backbone</h4>
                <p className="text-muted-foreground">EfficientNet-B0 with embedded DSP frontend (STFT → Mel → Log)</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">Parameters</h4>
                <p className="text-muted-foreground">~24.2M trainable parameters</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">Output Heads</h4>
                <p className="text-muted-foreground">Species (10,932), Genus (2,333), Family (249), Order (41), Class (38)</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-semibold mb-1">Embedding</h4>
                <p className="text-muted-foreground">1,280-dimensional feature vector from global average pooling</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted rounded text-sm text-muted-foreground">
              <Info className="w-4 h-4 inline mr-2" />
              AquaListen wraps SurfPerch with ecological mapping (Shannon entropy + richness heuristics) and an anthropogenic noise scorer to produce healthy/stressed/ambient classifications.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}