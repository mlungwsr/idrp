import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { signIn, signUp } from '../services/authService';
import { useAuth } from './AuthContext';

const Login = ({ open, onClose }) => {
  const { updateUser } = useAuth();
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAction = async () => {
    if (!loginData.username || !loginData.password) {
      setError('Username and password are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (showSignUp) {
        // Handle sign up
        if (!loginData.email) {
          setError('Email is required for sign up');
          setLoading(false);
          return;
        }

        const { success, error } = await signUp(
          loginData.username, 
          loginData.password,
          loginData.email
        );
        
        if (success) {
          setNotification({
            open: true,
            message: 'Account created successfully! You can now log in.',
            severity: 'success'
          });
          setShowSignUp(false); // Switch back to login view
          // Clear form data except username for easy login
          setLoginData(prev => ({
            ...prev,
            password: '',
            email: ''
          }));
        } else {
          setError(error || 'Failed to create account');
        }
      } else {
        // Handle login
        const { success, user, error } = await signIn(loginData.username, loginData.password);
        
        if (success) {
          console.log('Login successful, updating user context');
          await updateUser(user);
          onClose();
        } else {
          setError(error || 'Login failed. Please check your credentials.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Authentication error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    handleAction();
  };

  const handleClose = () => {
    setLoginData({ username: '', password: '', email: '' });
    setError('');
    setShowSignUp(false);
    onClose();
  };

  const toggleSignUp = () => {
    setShowSignUp(!showSignUp);
    setError('');
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{showSignUp ? 'Create Account' : 'Login'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <form id="login-form" onSubmit={handleSubmit} noValidate>
              <TextField
                autoFocus
                margin="dense"
                label="Username"
                type="text"
                fullWidth
                variant="outlined"
                name="username"
                value={loginData.username}
                onChange={handleChange}
                sx={{ mb: 2 }}
                disabled={loading}
                autoComplete={showSignUp ? "username" : "current-username"}
                inputProps={{
                  'aria-label': 'Username'
                }}
              />
              <TextField
                margin="dense"
                label="Password"
                type="password"
                fullWidth
                variant="outlined"
                name="password"
                value={loginData.password}
                onChange={handleChange}
                disabled={loading}
                autoComplete={showSignUp ? "new-password" : "current-password"}
                inputProps={{
                  'aria-label': 'Password'
                }}
              />
              {showSignUp && (
                <TextField
                  margin="dense"
                  label="Email"
                  type="email"
                  fullWidth
                  variant="outlined"
                  name="email"
                  value={loginData.email}
                  onChange={handleChange}
                  sx={{ mt: 2 }}
                  disabled={loading}
                  autoComplete="email"
                  inputProps={{
                    'aria-label': 'Email'
                  }}
                  required
                />
              )}
              {error && (
                <Typography variant="body2" sx={{ mt: 1, color: 'error.main' }}>
                  {error}
                </Typography>
              )}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={toggleSignUp}
                  sx={{ cursor: 'pointer' }}
                  type="button" // Explicitly set type to button to prevent form submission
                >
                  {showSignUp ? 'Already have an account? Login' : 'Need an account? Sign up'}
                </Link>
              </Box>
              {/* Hidden submit button to enable form submission on Enter key */}
              <button type="submit" style={{ display: 'none' }}></button>
            </form>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            type="button"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            form="login-form"
            variant="contained" 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (showSignUp ? 'Sign Up' : 'Login')}
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

export default Login;
