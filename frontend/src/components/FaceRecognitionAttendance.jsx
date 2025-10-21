import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Camera, Loader2, CheckCircle, XCircle, User, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';

const FaceRecognitionAttendance = ({ onSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkFaceRegistrationStatus();
    return () => {
      stopCamera();
    };
  }, []);

  const checkFaceRegistrationStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await api.get('/face-recognition/status');
      setFaceRegistered(response.data.data.face_registered);
    } catch (error) {
      console.error('Error checking face status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setCapturing(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCapturing(false);
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setProcessing(true);
      setError(null);
      setResult(null);

      // Capture image from video
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.95);

      console.log('📸 Capturing face for attendance...');

      // Send to backend for recognition and attendance marking
      const response = await api.post('/face-recognition/mark-attendance', {
        face_image: imageData
      });

      if (response.data.success) {
        const resultData = {
          success: true,
          status: response.data.data.status,
          confidence: response.data.data.confidence,
          checkIn: response.data.data.check_in,
          lateByMinutes: response.data.data.late_by_minutes || 0,
          message: response.data.message
        };
        
        console.log('✅ Attendance marked successfully:', resultData);
        setResult(resultData);
        
        // Stop camera after successful recognition
        stopCamera();
        
        // Notify parent component
        if (onSuccess) {
          onSuccess(response.data.data);
        }
      }
    } catch (err) {
      console.error('Recognition error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to recognize face. Please try again.';
      setError(errorMessage);
      setResult({ success: false });
      
      // Show error details if available
      if (err.response?.data?.data) {
        console.log('Error details:', err.response.data.data);
      }
    } finally {
      setProcessing(false);
    }
  };

  const registerFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setProcessing(true);
      setError(null);

      // Capture image from video
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.95);

      console.log('📸 Registering face...');

      const response = await api.post('/face-recognition/register', {
        face_image: imageData
      });

      if (response.data.success) {
        setFaceRegistered(true);
        setResult({
          success: true,
          message: 'Face registered successfully! You can now mark attendance.'
        });
        stopCamera();
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Failed to register face. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (checkingStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-6 w-6" />
          Face Recognition Attendance
        </CardTitle>
        <CardDescription>
          {faceRegistered 
            ? 'Position your face in the camera to mark attendance'
            : 'Register your face first to enable automatic attendance marking'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera View */}
        <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!capturing ? 'hidden' : ''}`}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {!capturing && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Camera not active</p>
                <p className="text-sm opacity-75 mt-2">Click "Start Camera" to begin</p>
              </div>
            </div>
          )}

          {/* Face Guide Overlay */}
          {capturing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-4 border-blue-500 rounded-full w-64 h-64 opacity-50"></div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {!capturing ? (
            <Button onClick={startCamera} className="flex-1">
              <Camera className="h-4 w-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <>
              <Button onClick={stopCamera} variant="outline" className="flex-1">
                Stop Camera
              </Button>
              {faceRegistered ? (
                <Button 
                  onClick={captureAndRecognize} 
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recognizing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Attendance
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={registerFace} 
                  disabled={processing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-2" />
                      Register Face
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Result */}
        {result?.success && (
          <div className={`p-4 border rounded-lg ${
            result.status === 'late' 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-start gap-3">
              <CheckCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                result.status === 'late' ? 'text-yellow-600' : 'text-green-600'
              }`} />
              <div className="flex-1">
                <p className={`font-medium ${
                  result.status === 'late' ? 'text-yellow-900' : 'text-green-900'
                }`}>
                  {result.message || `Attendance Marked: ${result.status?.toUpperCase()}`}
                </p>
                {result.confidence && (
                  <p className={`text-sm mt-1 ${
                    result.status === 'late' ? 'text-yellow-700' : 'text-green-700'
                  }`}>
                    Recognition Confidence: {result.confidence}%
                  </p>
                )}
                {result.checkIn && (
                  <p className={`text-sm flex items-center gap-1 mt-1 ${
                    result.status === 'late' ? 'text-yellow-700' : 'text-green-700'
                  }`}>
                    <Clock className="h-4 w-4" />
                    Check-in Time: {result.checkIn}
                  </p>
                )}
                {result.status === 'late' && result.lateByMinutes > 0 && (
                  <p className="text-sm text-yellow-700 flex items-center gap-1 mt-1 font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    You are {(() => {
                      const hours = Math.floor(result.lateByMinutes / 60);
                      const minutes = result.lateByMinutes % 60;
                      if (hours > 0) {
                        return `${hours}h ${minutes}m`;
                      }
                      return `${minutes}m`;
                    })()} late
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        {!faceRegistered && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Face Not Registered</p>
                <p className="text-sm text-blue-700 mt-1">
                  You need to register your face once before you can use automatic attendance marking.
                  Position your face clearly in the camera and click "Register Face".
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FaceRecognitionAttendance;
