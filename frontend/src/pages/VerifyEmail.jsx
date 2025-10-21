import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import api from '../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error, expired
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      setStatus('verifying');
      const response = await api.post('/auth/verify-email', { token });

      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        
        // Store token and user data
        if (response.data.data.token) {
          localStorage.setItem('token', response.data.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
          window.location.reload();
        }, 3000);
      }
    } catch (error) {
      console.error('Verification error:', error);
      
      if (error.response?.data?.expired) {
        setStatus('expired');
        setEmail(error.response.data.email);
        setMessage('Your verification link has expired. Please request a new one.');
      } else {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed. Please try again.');
      }
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('Please enter your email address.');
      return;
    }

    try {
      setResending(true);
      const response = await api.post('/auth/resend-verification', { email });

      if (response.data.success) {
        setMessage('Verification email sent! Please check your inbox.');
        setStatus('success');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">AI</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Email Verification</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-center mb-4">
              {status === 'verifying' && (
                <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle className="h-16 w-16 text-green-600" />
              )}
              {(status === 'error' || status === 'expired') && (
                <XCircle className="h-16 w-16 text-red-600" />
              )}
            </div>
            <CardTitle className="text-center">
              {status === 'verifying' && 'Verifying Your Email...'}
              {status === 'success' && 'Email Verified!'}
              {status === 'error' && 'Verification Failed'}
              {status === 'expired' && 'Link Expired'}
            </CardTitle>
            <CardDescription className="text-center">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'success' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 text-center">
                    Redirecting you to the dashboard in 3 seconds...
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/dashboard')} 
                  className="w-full"
                >
                  Go to Dashboard Now
                </Button>
              </div>
            )}

            {status === 'expired' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <Button 
                  onClick={handleResendVerification} 
                  className="w-full"
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <Button 
                  onClick={() => navigate('/register')} 
                  variant="outline"
                  className="w-full"
                >
                  Back to Registration
                </Button>
                <Button 
                  onClick={() => navigate('/login')} 
                  className="w-full"
                >
                  Go to Login
                </Button>
              </div>
            )}

            {status === 'verifying' && (
              <div className="text-center text-sm text-gray-600">
                Please wait while we verify your email address...
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="mailto:support@ai-hrms.com" className="text-blue-600 hover:text-blue-500">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
