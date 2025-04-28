import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Link,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from './AuthContext';
import { getDocuments, deleteDocument } from '../services/documentService';

const DocumentList = ({ isAdminMode, refreshTrigger = 0 }) => {
  const { isAuthenticated } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Fetch documents on component mount and when refreshTrigger changes
  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  // Filter documents when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDocuments(filtered);
    }
  }, [searchQuery, documents]);

  // Fetch documents from API
  const fetchDocuments = async () => {
    setLoading(true);
    setError('');

    try {
      const { success, data, error } = await getDocuments();
      
      if (success) {
        console.log('Documents received in component:', data);
        setDocuments(data);
        setFilteredDocuments(data);
      } else {
        setError(error || 'Failed to fetch documents');
      }
    } catch (err) {
      setError('An unexpected error occurred while fetching documents');
      console.error('Document fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleDeleteClick = (doc) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    
    setDeleteLoading(true);
    
    try {
      const { success, data, error } = await deleteDocument(documentToDelete.id);
      
      if (success) {
        // Remove the document from the local state
        setDocuments(documents.filter(doc => doc.id !== documentToDelete.id));
        setFilteredDocuments(filteredDocuments.filter(doc => doc.id !== documentToDelete.id));
        
        // Show success notification
        setNotification({
          open: true,
          message: `Document "${documentToDelete.title}" deleted successfully`,
          severity: 'success'
        });
      } else {
        setError(error || 'Failed to delete document');
        
        // Show error notification
        setNotification({
          open: true,
          message: error || 'Failed to delete document',
          severity: 'error'
        });
      }
    } catch (err) {
      const errorMessage = 'An unexpected error occurred while deleting the document';
      setError(errorMessage);
      setNotification({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
      console.error('Delete error:', err);
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleRefresh = () => {
    fetchDocuments();
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Format file size to human-readable format
  const formatFileSize = (bytes) => {
    if (bytes === undefined || bytes === null) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date to local string
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by document title..."
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ mr: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
        
        {error && (
          <Typography variant="body1" sx={{ color: 'error.main', mb: 2 }}>
            {error}
          </Typography>
        )}
        
        <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
          {filteredDocuments.length === 0 ? (
            <Typography variant="body1" sx={{ textAlign: 'center', p: 2 }}>
              {searchQuery ? 'No documents match your search.' : 'No documents available in the repository.'}
            </Typography>
          ) : (
            <List>
              {filteredDocuments.map((doc) => (
                <ListItem
                  key={doc.id}
                  divider
                  secondaryAction={
                    isAdminMode ? (
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteClick(doc)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    ) : (
                      doc.url && (
                        <IconButton
                          edge="end"
                          aria-label="open in new tab"
                          component="a"
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      )
                    )
                  }
                >
                  <ListItemText
                    primary={
                      doc.url ? (
                        <Link 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          sx={{ textDecoration: 'none' }}
                        >
                          {doc.title}
                        </Link>
                      ) : (
                        <Typography>{doc.title}</Typography>
                      )
                    }
                    secondary={
                      <Box component="span">
                        <Typography variant="body2" component="span">
                          Last modified: {formatDate(doc.lastModified)} | Size: {formatFileSize(doc.size)}
                        </Typography>
                        {!doc.url && (
                          <Typography 
                            variant="body2" 
                            color="error" 
                            component="span" 
                            sx={{ display: 'block', mt: 1 }}
                          >
                            File not found in S3
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete "{documentToDelete?.title}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleteLoading}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DocumentList;
