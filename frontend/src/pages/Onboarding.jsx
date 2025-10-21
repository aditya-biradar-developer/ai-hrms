import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card } from '../components/ui/Card';
import { CheckCircle, Loader2, AlertCircle, Briefcase, Calendar, Building } from 'lucide-react';

const Onboarding = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  const [candidateInfo, setCandidateInfo] = useState(null);
  
  const [formData, setFormData] = useState({
    start_date: '',
    department: ''
  });

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      setVerifying(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/applications/onboarding/${token}/verify`
      );

      if (response.data.success) {
        setCandidateInfo(response.data.data);
        setFormData({
          ...formData,
          department: response.data.data.department || ''
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired onboarding link');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.start_date) {
      alert('Please select a start date');
      return;
    }

    try {
      setConverting(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/applications/onboarding/${token}/convert`,
        formData
      );

      if (response.data.success) {
        setEmployeeData(response.data.data);
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete onboarding');
      setConverting(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your onboarding link...</p>
        </div>
      </div>
    );
  }

  if (error && !candidateInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Aboard!</h2>
          <p className="text-gray-600 mb-4">
            Your account has been successfully converted to an employee account.
          </p>
          
          {employeeData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
              <h3 className="font-semibold text-gray-900 mb-2">Your Employee Details:</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Employee ID:</strong> <span className="text-blue-600 font-mono">{employeeData.employee_id}</span></p>
                <p><strong>Position:</strong> {employeeData.position}</p>
                <p><strong>Department:</strong> {employeeData.department}</p>
              </div>
            </div>
          )}
          
          <p className="text-sm text-gray-500 mb-6">
            Redirecting you to login page...
          </p>
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Congratulations, {candidateInfo?.candidateName}! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            You've been selected for the position of <span className="font-semibold text-blue-600">{candidateInfo?.position}</span>
          </p>
        </div>

        {/* Info Card */}
        <Card className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Position Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Position</p>
              <p className="font-medium text-gray-900">{candidateInfo?.position}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-medium text-gray-900">{candidateInfo?.department || 'To be assigned'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{candidateInfo?.candidateEmail}</p>
            </div>
          </div>
        </Card>

        {/* Onboarding Form */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Onboarding</h2>
          <p className="text-gray-600 mb-6">
            Please provide the following information to convert your account to an employee account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Your Employee ID will be automatically generated by the system upon completing this form.
              </p>
            </div>

            <div>
              <Label htmlFor="start_date">
                Start Date *
              </Label>
              <Input
                id="start_date"
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your first day of work
              </p>
            </div>

            <div>
              <Label htmlFor="department">
                Department
              </Label>
              <Input
                id="department"
                type="text"
                placeholder={candidateInfo?.department || "e.g., Engineering"}
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use default department
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={converting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
            >
              {converting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Converting Account...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Complete Onboarding
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            By completing onboarding, you confirm that all information is accurate and you agree to the company's terms of employment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
