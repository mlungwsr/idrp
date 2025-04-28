import { Amplify } from 'aws-amplify';
import { 
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  getCurrentUser as amplifyGetCurrentUser,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
  fetchAuthSession
} from '@aws-amplify/auth';
import { cognitoConfig, apiConfig } from '../config';
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: apiConfig.apiBaseUrl
});

// Configure Amplify Auth with the new client ID
Amplify.configure({
  Auth: {
    Cognito: {
      region: cognitoConfig.region,
      userPoolId: cognitoConfig.userPoolId,
      userPoolClientId: cognitoConfig.userPoolWebClientId
    }
  }
});

// Sign in with username and password
export const signIn = async (username, password) => {
  try {
    const user = await amplifySignIn({ username, password });
    return { success: true, user };
  } catch (error) {
    // Handle specific error types
    if (error.name === 'NotAuthorizedException') {
      // This is an expected error for wrong credentials, don't log to console
      return { 
        success: false, 
        error: 'Incorrect username or password. Please try again.' 
      };
    } else if (error.name === 'UserNotFoundException') {
      return {
        success: false,
        error: 'User not found. Please check your username or sign up.'
      };
    } else if (error.name === 'UserNotConfirmedException') {
      return {
        success: false,
        error: 'User account not verified. Please check your email for verification instructions.'
      };
    }
    
    // For other errors, log them but with a cleaner message
    console.error('Authentication error:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    
    return { 
      success: false, 
      error: 'An error occurred during sign in. Please try again later.' 
    };
  }
};

// Sign out
export const signOut = async () => {
  try {
    await amplifySignOut();
    return { success: true };
  } catch (error) {
    console.error('Error signing out:', error);
    return { success: false, error: error.message };
  }
};

// Get current authenticated user
export const getCurrentUser = async () => {
  try {
    const user = await amplifyGetCurrentUser();
    return { success: true, user };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { success: false, error: error.message };
  }
};

// Sign up a new user using our backend API (which creates a verified user)
export const signUp = async (username, password, email) => {
  try {
    // Call our backend API to create a pre-verified user
    const response = await api.post('/signup', {
      username,
      password,
      email
    });
    
    console.log('Signup response:', response.data);
    
    return { 
      success: true, 
      message: 'Account created successfully! You can now log in.' 
    };
  } catch (error) {
    // Handle API errors
    const errorMessage = error.response?.data?.error || error.message;
    
    // Check for common error messages
    if (errorMessage.includes('User account already exists')) {
      return {
        success: false,
        error: 'This username already exists. Please try another one or sign in.'
      };
    }
    
    console.error('Error signing up:', error);
    return { 
      success: false, 
      error: errorMessage || 'Failed to create account. Please try again.' 
    };
  }
};

// Confirm sign up with verification code
export const confirmSignUp = async (username, code) => {
  try {
    await amplifyConfirmSignUp({ username, confirmationCode: code });
    return { success: true };
  } catch (error) {
    console.error('Error confirming sign up:', error);
    return { success: false, error: error.message };
  }
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  try {
    await amplifyGetCurrentUser();
    return true;
  } catch (error) {
    return false;
  }
};

// Get JWT token for API calls
export const getIdToken = async () => {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Export fetchAuthSession for use in AuthContext
export { fetchAuthSession };
