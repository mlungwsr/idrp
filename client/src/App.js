import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Snackbar,
  Alert
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import UploadIcon from '@mui/icons-material/Upload';
import SettingsIcon from '@mui/icons-material/Settings';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';

// Import components
import DocumentList from './components/DocumentList';
import Login from './components/Login';
import UploadDialog from './components/UploadDialog';
import { AuthProvider, useAuth } from './components/AuthContext';

function AppContent() {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [openLogin, setOpenLogin] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Refs for focus management
  const uploadButtonRef = useRef(null);

  // Debug log for isAdmin state
  useEffect(() => {
    console.log('AppContent - isAdmin state:', isAdmin);
  }, [isAdmin]);

  const handleLoginOpen = () => {
    setOpenLogin(true);
  };

  const handleLoginClose = () => {
    setOpenLogin(false);
  };

  const handleUploadOpen = () => {
    setOpenUpload(true);
  };

  const handleUploadClose = () => {
    setOpenUpload(false);
    
    // Return focus to the upload button after dialog closes
    if (uploadButtonRef.current) {
      setTimeout(() => {
        uploadButtonRef.current.focus();
      }, 0);
    }
  };

  const handleUploadSuccess = () => {
    setNotification({
      open: true,
      message: 'Document uploaded successfully!',
      severity: 'success'
    });
    
    // Trigger document list refresh
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = () => {
    logout();
    setIsAdminMode(false);
    setNotification({
      open: true,
      message: 'You have been logged out',
      severity: 'info'
    });
  };

  const toggleAdminMode = () => {
    setIsAdminMode(!isAdminMode);
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed" sx={{ backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#1976d2' }}>
            Internal Document Repository Portal
          </Typography>
          <Button
            color="primary"
            startIcon={<HomeIcon />}
            sx={{ mr: 2 }}
            onClick={() => setIsAdminMode(false)}
          >
            View Files
          </Button>
          {isAuthenticated ? (
            <>
              <Button
                color="primary"
                startIcon={<UploadIcon />}
                onClick={handleUploadOpen}
                sx={{ mr: 2 }}
                ref={uploadButtonRef}
              >
                Upload Files
              </Button>
              {isAdmin && (
                <Button
                  color="primary"
                  startIcon={<SettingsIcon />}
                  onClick={toggleAdminMode}
                  sx={{ mr: 2, backgroundColor: isAdminMode ? 'rgba(25, 118, 210, 0.1)' : 'transparent' }}
                >
                  Admin
                </Button>
              )}
              <Button
                color="primary"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          ) : (
            <Button
              color="primary"
              startIcon={<LoginIcon />}
              onClick={handleLoginOpen}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 10, mb: 4 }}>
        <DocumentList isAdminMode={isAdminMode} refreshTrigger={refreshTrigger} />
      </Container>

      {/* Login Dialog */}
      <Login open={openLogin} onClose={handleLoginClose} />

      {/* Upload Dialog */}
      <UploadDialog 
        open={openUpload} 
        onClose={handleUploadClose} 
        onUploadSuccess={handleUploadSuccess} 
      />

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
    </Box>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
