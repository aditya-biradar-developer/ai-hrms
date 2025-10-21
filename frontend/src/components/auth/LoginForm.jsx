import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [accountLocked, setAccountLocked] = useState(false);
  const [lockoutMinutes, setLockoutMinutes] = useState(0);
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      
      // Check for specific error types
      if (err.response?.data?.requiresVerification) {
        setVerificationRequired(true);
        setErrors({ verification: err.response.data.message });
      } else if (err.response?.data?.accountLocked) {
        setAccountLocked(true);
        setLockoutMinutes(err.response.data.minutesLeft || 30);
        setErrors({ lockout: err.response.data.message });
      }
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/resend-verification`, {
        email: formData.email
      });
      
      if (response.data.success) {
        alert('Verification email sent! Please check your inbox.');
      }
    } catch (error) {
      alert('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
        <CardDescription className="text-center">
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>
          {/* Email Verification Required */}
          {verificationRequired && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md space-y-3">
              <p className="text-sm text-yellow-800">{errors.verification}</p>
              <Button 
                type="button"
                variant="outline" 
                className="w-full"
                onClick={handleResendVerification}
              >
                Resend Verification Email
              </Button>
            </div>
          )}

          {/* Account Locked */}
          {accountLocked && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <p className="text-sm text-red-800 font-semibold mb-2">Account Locked</p>
              <p className="text-sm text-red-700">
                Your account has been locked due to multiple failed login attempts.
              </p>
              <p className="text-sm text-red-600 mt-2">
                Please try again in <strong>{lockoutMinutes} minutes</strong>.
              </p>
            </div>
          )}

          {/* General Error */}
          {error && !verificationRequired && !accountLocked && (
            <div className="bg-red-50 p-3 rounded-md">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoginForm;