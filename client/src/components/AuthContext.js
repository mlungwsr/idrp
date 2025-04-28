import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, isAuthenticated, signOut } from '../services/authService';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export const AuthProvider = ({ children }) => {
  // Initialize state from localStorage
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('authUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  
  const [loading, setLoading] = useState(true);
  
  // All authenticated users are admins
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('authUser') ? true : false;
  });

  // Check authentication status on mount
  useEffect(() => {
    console.log('AuthProvider mounted, checking auth status');
    
    // For development, just use localStorage and don't validate with Cognito
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      console.log('Found user in localStorage, setting as authenticated');
      setUser(JSON.parse(storedUser));
      setIsAdmin(true);
    }
    
    setLoading(false);
  }, []);

  // Log out user
  const logout = async () => {
    console.log('Logging out user');
    try {
      await signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      // Always clear local storage and state on logout
      localStorage.removeItem('authUser');
      setUser(null);
      setIsAdmin(false);
    }
  };

  // Update user context when user changes
  const updateUser = async (newUser) => {
    console.log('Updating user:', newUser);
    
    // Store a simplified version of the user object
    const userToStore = {
      username: newUser.username,
      // Add any other needed properties
    };
    
    // Update localStorage
    localStorage.setItem('authUser', JSON.stringify(userToStore));
    
    // Update state
    setUser(userToStore);
    setIsAdmin(true);
    console.log('User updated and stored in localStorage');
  };

  // Context value
  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin,
    loading,
    updateUser,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
