import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUploadArea } from '@/components/FileUploadArea';
import { SpectrogramViewer } from '@/components/SpectrogramViewer';
import { HealthStatusCard } from '@/components/HealthStatusCard';
import { Badge } from '@/components/ui/badge';
import { Upload as UploadIcon, Play, Pause, Download, RotateCcw } from 'lucide-react';
import { useSites } from "@/contexts/SitesContext";
import { apiService } from '@/lib/api';

export default function Upload() {
  const { addSite } = useSites();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [notes, setNotes] = useState('');
  const [customTimestamp, setCustomTimestamp] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // TODO: remove mock functionality - replace with real sites data
  const mockSites = [
    'Great Barrier Reef - Station A',
    'Coral Bay - Station B', 
    'Ningaloo Reef - Station C',
    'Heron Island - Station D',
    'Lizard Island - Station E'
  ];

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setPredictionResult(null); // Clear previous results
  };

  const handleFileRemove = (fileId: string) => {
    console.log('File removed:', fileId);
    setSelectedFiles([]);
    setPredictionResult(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    setPredictionResult(null);
    
    try {
      // Use the API service which handles the correct URL and error handling
      const result = await apiService.uploadAudio(file);
      
      console.log('API Response:', result);
      setPredictionResult(result);
      
      // Save to sites context for the map
      addSite({
        name: selectedSite || 'Unnamed Site',
        lat: -20.0, // Default latitude, you might want to get this from the form
        lng: 140.0, // Default longitude, you might want to get this from the form
        lastHealth: result.prediction.health_status,
        lastConfidence: result.prediction.confidence * 100,
      });
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      alert('Please select an audio file');
      return;
    }
    
    if (!selectedSite) {
      alert('Please select a monitoring site');
      return;
    }

    await handleFileUpload(selectedFiles[0]);
  };

  const handleRetry = () => {
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  const downloadResults = () => {
    if (predictionResult) {
      const dataStr = JSON.stringify(predictionResult, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${predictionResult.file_info.filename}_results.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    console.log(isPlaying ? 'Pausing audio' : 'Playing audio');
    // TODO: Implement actual audio playback
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setSelectedSite('');
    setNotes('');
    setCustomTimestamp('');
    setPredictionResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="page-upload">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Single File Upload</h1>
          <p className="text-muted-foreground mt-1">
            Upload an audio file for real-time reef health analysis
          </p>
        </div>
        <Button variant="outline" onClick={resetForm} data-testid="button-reset-form">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Form
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <Card data-testid="card-upload-form">
          <CardHeader>
            <CardTitle>Upload Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <FileUploadArea
                multiple={false}
                maxFiles={1}
                onFilesSelected={handleFilesSelected}
                onFileRemove={handleFileRemove}
              />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site-select">Monitoring Site *</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger data-testid="select-site">
                      <SelectValue placeholder="Select a monitoring site" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockSites.map(site => (
                        <SelectItem key={site} value={site}>
                          {site}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timestamp">Custom Timestamp (optional)</Label>
                  <Input
                    id="timestamp"
                    type="datetime-local"
                    value={customTimestamp}
                    onChange={(e) => setCustomTimestamp(e.target.value)}
                    data-testid="input-timestamp"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any relevant notes about this recording..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    data-testid="textarea-notes"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  disabled={isUploading || selectedFiles.length === 0 || !selectedSite}
                  className="flex-1"
                  data-testid="button-upload"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-4 h-4 mr-2" />
                      Analyze Audio
                    </>
                  )}
                </Button>

                {selectedFiles.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={togglePlayback}
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* File Preview */}
        <Card data-testid="card-file-preview">
          <CardHeader>
            <CardTitle>File Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedFiles.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-2">File Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedFiles[0].name}</p>
                    <p><span className="font-medium">Size:</span> {(selectedFiles[0].size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><span className="font-medium">Type:</span> {selectedFiles[0].type || 'Unknown'}</p>
                  </div>
                </div>

                {/* Spectrogram Preview */}
                <SpectrogramViewer
                  width={400}
                  height={200}
                  sampleRate={44100}
                />

                <div className="text-xs text-muted-foreground">
                  Spectrogram preview generated from audio file
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <UploadIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select an audio file to see preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {predictionResult && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Analysis Results</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HealthStatusCard
              status={predictionResult.prediction.health_status}
              confidence={predictionResult.prediction.confidence * 100}  // Convert to percentage
              filename={predictionResult.file_info.filename}
              site={selectedSite}
              timestamp={predictionResult.processing.timestamp}
            />

            <Card data-testid="card-technical-details">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Technical Details</CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleRetry} data-testid="button-retry">
                      Retry
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadResults} data-testid="button-download">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Processing Time:</span>
                    <p className="text-muted-foreground">
                      {predictionResult.processing.processing_time_seconds.toFixed(2)}s
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Model:</span>
                    <p className="text-muted-foreground">
                      {predictionResult.processing.model_used}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <p className="text-muted-foreground">
                      {predictionResult.file_info.duration_seconds.toFixed(1)}s
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Sample Rate:</span>
                    <p className="text-muted-foreground">
                      {predictionResult.file_info.sample_rate}Hz
                    </p>
                  </div>
                </div>

                {predictionResult.acoustic_features && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-sm mb-2">Acoustic Features</h4>
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>Spectral Centroid: {predictionResult.acoustic_features.spectral_centroid_hz.toFixed(0)}Hz</p>
                      <p>Spectral Bandwidth: {predictionResult.acoustic_features.spectral_bandwidth_hz.toFixed(0)}Hz</p>
                      <p>Zero Crossing Rate: {predictionResult.acoustic_features.zero_crossing_rate.toFixed(4)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}