import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileUploadArea } from '@/components/FileUploadArea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  Square, 
  Download, 
  Trash2, 
  RefreshCw,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface BatchFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: {
    health_status: 'healthy' | 'stressed' | 'ambient';
    confidence: number;
    processing_time: number;
  };
  error?: string;
}

export default function Batch() {
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const MAX_FILES = 20;

  const handleFilesSelected = (files: File[]) => {
    const newBatchFiles: BatchFile[] = files.map(file => ({
      id: Math.random().toString(36),
      file,
      status: 'pending',
      progress: 0
    }));

    setBatchFiles(prev => {
      const combined = [...prev, ...newBatchFiles];
      return combined.slice(0, MAX_FILES); // Enforce max files limit
    });
  };

  const handleFileRemove = (fileId: string) => {
    setBatchFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeFile = (fileId: string) => {
    setBatchFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryFile = async (fileId: string) => {
    setBatchFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, status: 'pending', progress: 0, result: undefined, error: undefined }
        : f
    ));

    // Process just this file
    processFile(fileId);
  };

  const processFile = async (fileId: string) => {
    setBatchFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'processing', progress: 0 } : f
    ));

    try {
      const file = batchFiles.find(f => f.id === fileId)?.file;
      if (!file) throw new Error('File not found');

      // Create FormData for API call
      const formData = new FormData();
      formData.append('file', file);

      // Update progress to show we're starting
      setBatchFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 25 } : f
      ));

      // Call the real ML API
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      // Update progress
      setBatchFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 75 } : f
      ));

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Prediction failed');
      }

      // Extract the prediction data
      const apiResult = {
        health_status: result.prediction.health_status,
        confidence: result.prediction.confidence * 100, // Convert to percentage
        processing_time: result.processing.processing_time_seconds
      };

      setBatchFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'completed', progress: 100, result: apiResult }
          : f
      ));

    } catch (error) {
      setBatchFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'error', error: (error as Error).message }
          : f
      ));
    }
  };

  const startBatchProcessing = async () => {
    setIsProcessing(true);
    setIsPaused(false);

    const pendingFiles = batchFiles.filter(f => f.status === 'pending');
    
    // Process files sequentially to avoid overloading
    for (const file of pendingFiles) {
      if (isPaused) break;
      await processFile(file.id);
      
      // Small delay between files
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsProcessing(false);
  };

  const pauseProcessing = () => {
    setIsPaused(true);
    setIsProcessing(false);
  };

  const cancelProcessing = () => {
    setIsProcessing(false);
    setIsPaused(false);
    
    setBatchFiles(prev => prev.map(f => 
      f.status === 'processing' 
        ? { ...f, status: 'pending', progress: 0 }
        : f
    ));
  };

  const clearAll = () => {
    setBatchFiles([]);
    setIsProcessing(false);
    setIsPaused(false);
  };

  const downloadResults = () => {
    const completedFiles = batchFiles.filter(f => f.status === 'completed');
    const results = completedFiles.map(f => ({
      filename: f.file.name,
      ...f.result
    }));

    const dataStr = JSON.stringify(results, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_results_${new Date().getTime()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusCounts = () => {
    const counts = batchFiles.reduce((acc, file) => {
      acc[file.status] = (acc[file.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      pending: counts.pending || 0,
      processing: counts.processing || 0,
      completed: counts.completed || 0,
      error: counts.error || 0
    };
  };

  const statusCounts = getStatusCounts();
  const canStartProcessing = statusCounts.pending > 0 && !isProcessing;
  const hasResults = statusCounts.completed > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="page-batch">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Processing</h1>
          <p className="text-muted-foreground mt-1">
            Upload multiple audio files for batch reef health analysis (max {MAX_FILES} files)
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={downloadResults}
            disabled={!hasResults}
            data-testid="button-download-results"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Results
          </Button>
          <Button
            variant="outline"
            onClick={clearAll}
            disabled={batchFiles.length === 0}
            data-testid="button-clear-all"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {batchFiles.length >= MAX_FILES && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Maximum {MAX_FILES} files reached. Remove some files to add more.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-2">
          <Card data-testid="card-upload-area">
            <CardHeader>
              <CardTitle>
                <FolderOpen className="w-5 h-5 inline mr-2" />
                File Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploadArea
                multiple={true}
                maxFiles={MAX_FILES}
                onFilesSelected={handleFilesSelected}
                onFileRemove={handleFileRemove}
              />
            </CardContent>
          </Card>
        </div>

        {/* Status Panel */}
        <Card data-testid="card-status-panel">
          <CardHeader>
            <CardTitle>Batch Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
                <div className="text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{statusCounts.processing}</div>
                <div className="text-muted-foreground">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{statusCounts.completed}</div>
                <div className="text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{statusCounts.error}</div>
                <div className="text-muted-foreground">Failed</div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={startBatchProcessing}
                disabled={!canStartProcessing}
                className="w-full"
                data-testid="button-start-processing"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Processing
              </Button>
              
              {isProcessing && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={pauseProcessing}
                    className="flex-1"
                    data-testid="button-pause"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                  <Button
                    variant="outline"
                    onClick={cancelProcessing}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Files Table */}
      {batchFiles.length > 0 && (
        <Card data-testid="card-files-table">
          <CardHeader>
            <CardTitle>Files ({batchFiles.length}/{MAX_FILES})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {batchFiles.map(batchFile => (
                <div 
                  key={batchFile.id} 
                  className="flex items-center space-x-4 p-4 border rounded-lg"
                  data-testid={`row-file-${batchFile.id}`}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {batchFile.status === 'pending' && <Clock className="w-5 h-5 text-yellow-500" />}
                    {batchFile.status === 'processing' && (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {batchFile.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {batchFile.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid="text-filename">
                      {batchFile.file.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(batchFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  {/* Progress/Result */}
                  <div className="flex-1">
                    {batchFile.status === 'processing' && (
                      <div className="space-y-1">
                        <Progress value={batchFile.progress} className="h-2" />
                        <p className="text-xs text-center">{batchFile.progress.toFixed(0)}%</p>
                      </div>
                    )}
                    
                    {batchFile.status === 'completed' && batchFile.result && (
                      <div className="text-center">
                        <Badge 
                          className={
                            batchFile.result.health_status === 'healthy' 
                              ? 'bg-green-100 text-green-800' 
                              : batchFile.result.health_status === 'stressed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }
                        >
                          {batchFile.result.health_status.toUpperCase()}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {batchFile.result.confidence.toFixed(1)}% confidence
                        </p>
                      </div>
                    )}
                    
                    {batchFile.status === 'error' && (
                      <p className="text-sm text-red-600 text-center">
                        {batchFile.error}
                      </p>
                    )}
                    
                    {batchFile.status === 'pending' && (
                      <p className="text-sm text-muted-foreground text-center">
                        Waiting...
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {batchFile.status === 'error' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryFile(batchFile.id)}
                        data-testid={`button-retry-${batchFile.id}`}
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFile(batchFile.id)}
                      disabled={batchFile.status === 'processing'}
                      data-testid={`button-remove-${batchFile.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}