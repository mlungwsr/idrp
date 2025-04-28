import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert
} from '@mui/material';
import { uploadDocument } from '../services/documentService';

const UploadDialog = ({ open, onClose, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadResponse, setUploadResponse] = useState(null);
  
  // Create refs for focus management
  const cancelButtonRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setUploadResponse(null);

    try {
      // Call the upload service with real progress tracking
      const { success, data, error } = await uploadDocument(selectedFile, (progress) => {
        setUploadProgress(progress);
      });
      
      if (success) {
        setUploadProgress(100);
        setUploadResponse(data);
        
        // Notify parent component of successful upload
        onUploadSuccess();
        
        // Close dialog after a short delay to show 100% completion
        setTimeout(() => {
          handleClose();
        }, 1000);
      } else {
        setError(error || 'Upload failed');
        setUploading(false);
      }
    } catch (err) {
      setError('An unexpected error occurred during upload');
      setUploading(false);
      console.error('Upload error:', err);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setError('');
      setUploadProgress(0);
      setUploadResponse(null);
      onClose();
    }
  };

  // Handle key events for accessibility
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && !uploading) {
      handleClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={(event, reason) => {
        if (reason !== 'backdropClick' || !uploading) {
          handleClose();
        }
      }}
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={uploading}
      keepMounted={false}
      onKeyDown={handleKeyDown}
      aria-labelledby="upload-dialog-title"
    >
      <DialogTitle id="upload-dialog-title">Upload Document</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {uploading ? (
            <Box sx={{ width: '100%' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Uploading: {uploadProgress}%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ height: 10, borderRadius: 5 }}
              />
              
              {uploadResponse && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  File uploaded successfully!
                </Alert>
              )}
            </Box>
          ) : (
            <>
              <input
                type="file"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="file-upload"
                ref={fileInputRef}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                >
                  Browse Files
                </Button>
              </label>
              {selectedFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected: {selectedFile.name}
                </Typography>
              )}
              {error && (
                <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
                  {error}
                </Typography>
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={uploading}
          ref={cancelButtonRef}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleUpload} 
          variant="contained" 
          disabled={uploading || !selectedFile}
          autoFocus={!!selectedFile}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UploadDialog;
