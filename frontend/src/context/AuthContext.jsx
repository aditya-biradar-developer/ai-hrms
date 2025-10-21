import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user from token on app start
  useEffect(() => {
    let isMounted = true; // Prevent double-calling in React StrictMode
    
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // No token found - this is normal for login/register pages
        // Just set loading to false without showing error
        if (isMounted) {
          dispatch({ 
            type: AUTH_ACTIONS.LOAD_USER_FAILURE, 
            payload: null // Don't set error message for missing token
          });
        }
        return;
      }
      
      console.log('🔐 Loading user from token...');
      
      try {
        if (isMounted) {
          dispatch({ type: AUTH_ACTIONS.LOAD_USER_START });
        }
        
        const response = await authService.getCurrentUser();
        console.log('✅ User loaded successfully:', response.data.user);
        
        if (isMounted) {
          dispatch({ 
            type: AUTH_ACTIONS.LOAD_USER_SUCCESS, 
            payload: response.data.user 
          });
        }
      } catch (error) {
        console.error('❌ Failed to load user:', error);
        console.error('Error status:', error.response?.status);
        console.error('Error message:', error.response?.data?.message);
        
        if (!isMounted) return;
        
        // Don't logout on rate limit errors (429)
        if (error.response?.status === 429) {
          console.log('⚠️ Rate limited - will retry');
          // Don't dispatch failure, keep current state
          return;
        }
        
        dispatch({ 
          type: AUTH_ACTIONS.LOAD_USER_FAILURE, 
          payload: error.response?.data?.message || 'Failed to load user' 
        });
        
        // Only logout if it's a 401 error (invalid token)
        if (error.response?.status === 401) {
          console.log('🚪 Logging out due to invalid token');
          authService.logout();
        }
      }
    };

    loadUser();
    
    return () => {
      isMounted = false; // Cleanup to prevent state updates on unmounted component
    };
  }, []); // Empty dependency array - only run once on mount

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });
      const response = await authService.login(credentials);
      
      // Store token and user in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_SUCCESS, 
        payload: response.data 
      });
      
      return response.data;
    } catch (error) {
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_FAILURE, 
        payload: error.response?.data?.message || 'Login failed' 
      });
      throw error;
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.REGISTER_START });
      const response = await authService.register(userData);
      
      // Check if email verification is required
      if (response.data.requiresVerification) {
        // Don't store token/user yet - verification needed first
        dispatch({ 
          type: AUTH_ACTIONS.REGISTER_SUCCESS, 
          payload: response.data 
        });
        return response.data;
      }
      
      // Old flow - direct login (backward compatibility)
      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        dispatch({ 
          type: AUTH_ACTIONS.REGISTER_SUCCESS, 
          payload: response.data 
        });
      }
      
      return response.data;
    } catch (error) {
      dispatch({ 
        type: AUTH_ACTIONS.REGISTER_FAILURE, 
        payload: error.response?.data?.message || 'Registration failed' 
      });
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    authService.logout();
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Value object
  const value = {
    ...state,
    login,
    register,
    logout,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};