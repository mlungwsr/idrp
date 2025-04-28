import axios from 'axios';
import { apiConfig } from '../config';
import { getIdToken } from './authService';

// Create axios instance with base URL
const api = axios.create({
  baseURL: apiConfig.apiBaseUrl
});

// Add auth token to requests when available
api.interceptors.request.use(async (config) => {
  const token = await getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get documents from the database with S3 metadata and presigned URLs
export const getDocuments = async () => {
  try {
    const response = await api.get('/documents');
    console.log('Documents retrieved from API:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error fetching documents:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch documents' 
    };
  }
};

// Upload a document to S3 and add to database
export const uploadDocument = async (file, progressCallback) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        // Calculate and report upload progress
        if (progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
          
          // Call the progress callback if provided
          if (progressCallback && typeof progressCallback === 'function') {
            progressCallback(percentCompleted);
          }
        }
      }
    });
    
    console.log('Upload response:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error uploading document:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to upload document' 
    };
  }
};

// Delete a document from S3 and database
export const deleteDocument = async (id) => {
  try {
    const response = await api.delete(`/documents/${id}`);
    console.log('Delete response:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'Failed to delete document' 
    };
  }
};
