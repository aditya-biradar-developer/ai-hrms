import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Clock, LogIn, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const CheckInOutButton = () => {
  const [status, setStatus] = useState({
    hasCheckedIn: false,
    hasCheckedOut: false,
    attendance: null
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchTodayStatus();
    
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchTodayStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/attendance/today-status');
      setStatus(response.data.data);
    } catch (error) {
      console.error('Error fetching today status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const response = await api.post('/attendance/check-in');
      
      if (response.data.success) {
        alert(response.data.message);
        fetchTodayStatus();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const response = await api.post('/attendance/check-out');
      
      if (response.data.success) {
        alert(response.data.message);
        fetchTodayStatus();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
        <CardContent className="p-6">
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Current Time Display */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5" />
              <span className="text-sm font-medium opacity-90">{formatDate(currentTime)}</span>
            </div>
            <div className="text-5xl font-bold tracking-tight">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Status Display */}
          {status.hasCheckedIn && (
            <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Check-in Time</p>
                  <p className="text-2xl font-bold">{status.attendance?.check_in_time || '--:--'}</p>
                  {status.attendance?.is_late && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="h-4 w-4 text-yellow-300" />
                      <span className="text-xs text-yellow-300">
                        Late by {status.attendance.late_by_minutes} min
                      </span>
                    </div>
                  )}
                </div>
                {status.hasCheckedOut && (
                  <div className="text-right">
                    <p className="text-sm opacity-90">Check-out Time</p>
                    <p className="text-2xl font-bold">{status.attendance?.check_out_time || '--:--'}</p>
                    {status.attendance?.work_hours && (
                      <p className="text-xs opacity-75 mt-1">
                        {status.attendance.work_hours} hours worked
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {!status.hasCheckedIn && (
              <Button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="w-full h-14 text-lg font-semibold bg-white text-blue-600 hover:bg-gray-100 transition-all transform hover:scale-105"
              >
                {actionLoading ? (
                  'Processing...'
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    Check In
                  </>
                )}
              </Button>
            )}

            {status.hasCheckedIn && !status.hasCheckedOut && (
              <Button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="w-full h-14 text-lg font-semibold bg-white text-blue-600 hover:bg-gray-100 transition-all transform hover:scale-105"
              >
                {actionLoading ? (
                  'Processing...'
                ) : (
                  <>
                    <LogOut className="mr-2 h-5 w-5" />
                    Check Out
                  </>
                )}
              </Button>
            )}

            {status.hasCheckedOut && (
              <div className="flex items-center justify-center gap-2 py-4">
                <CheckCircle className="h-6 w-6 text-green-300" />
                <span className="text-lg font-semibold">Attendance Complete for Today!</span>
              </div>
            )}
          </div>

          {/* Work Schedule Info */}
          <div className="text-center text-sm opacity-75 pt-2 border-t border-white/20">
            <p>Work Hours: 9:00 AM - 6:00 PM</p>
            <p className="text-xs mt-1">Grace Period: 15 minutes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckInOutButton;
