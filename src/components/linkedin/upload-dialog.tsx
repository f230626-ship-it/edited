"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileArchive, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { processLinkedInExport } from "@/actions/linkedin";
import { toast } from "sonner";

interface LinkedInUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}

type UploadStage = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export function LinkedInUploadDialog({
  open,
  onOpenChange,
  employeeId,
}: LinkedInUploadDialogProps) {
  const router = useRouter();
  const [stage, setStage] = useState<UploadStage>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.zip')) {
      toast.error('Please upload a ZIP file');
      return;
    }

    if (selectedFile.size > 100 * 1024 * 1024) { // 100MB limit
      toast.error('File size must be less than 100MB');
      return;
    }

    setFile(selectedFile);
    setStage('idle');
    setError('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setStage('uploading');
    setProgress(10);
    setMessage('Uploading LinkedIn export...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employee_id', employeeId);

      setProgress(30);
      setMessage('Extracting files...');
      setStage('processing');

      const result = await processLinkedInExport(formData);

      if (result.success) {
        setProgress(100);
        setMessage('Processing complete!');
        setStage('completed');

        toast.success('LinkedIn data imported successfully');

        // Redirect after short delay
        setTimeout(() => {
          router.refresh();
          onOpenChange(false);
          resetDialog();
        }, 1500);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setStage('error');
      setError(err.message || 'Failed to process LinkedIn export');
      toast.error('Upload failed');
    }
  };

  const resetDialog = () => {
    setFile(null);
    setStage('idle');
    setProgress(0);
    setMessage('');
    setError('');
  };

  const handleClose = () => {
    if (stage === 'processing' || stage === 'uploading') {
      return; // Prevent closing during upload
    }
    onOpenChange(false);
    resetDialog();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload LinkedIn Export</DialogTitle>
          <DialogDescription>
            Upload your LinkedIn Data Export ZIP file to generate AI-powered insights
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Drop Zone */}
          {!file && stage === 'idle' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }
              `}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Drop your LinkedIn export here
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                or click to browse
              </p>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileSelect(selectedFile);
                }}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Choose File
              </Button>
            </div>
          )}

          {/* File Selected */}
          {file && stage === 'idle' && (
            <div className="border rounded-lg p-4 flex items-start gap-3">
              <FileArchive className="h-10 w-10 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
              >
                Remove
              </Button>
            </div>
          )}

          {/* Progress */}
          {(stage === 'uploading' || stage === 'processing') && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{message}</p>
                  <Progress value={progress} className="h-2 mt-2" />
                </div>
              </div>
            </div>
          )}

          {/* Success */}
          {stage === 'completed' && (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  {message}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Redirecting to analytics dashboard...
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {stage === 'error' && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Upload Failed
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          {stage === 'idle' && (
            <div className="rounded-lg bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium">How to get your LinkedIn Data Export:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Go to LinkedIn Settings & Privacy</li>
                <li>Click "Get a copy of your data"</li>
                <li>Select "Download larger data archive"</li>
                <li>Wait for email with download link</li>
                <li>Upload the ZIP file here</li>
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={stage === 'uploading' || stage === 'processing'}
            >
              Cancel
            </Button>
            {file && stage === 'idle' && (
              <Button onClick={handleUpload}>
                Upload & Analyze
              </Button>
            )}
            {stage === 'error' && (
              <Button onClick={() => {
                setStage('idle');
                setError('');
              }}>
                Try Again
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
