import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Briefcase, FileText, TrendingUp, Calendar, Search, MapPin, Clock, DollarSign, X } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import dashboardService from '../../services/dashboardService';

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalApplications: 0,
    applicationStatusCount: {
      pending: 0,
      reviewed: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0
    },
    availableJobs: 0,
    myApplications: [],
    recommendedJobs: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  const openJobModal = (job) => {
    // Redirect to Jobs page with selected job
    navigate('/jobs', { state: { selectedJobId: job.id } });
  };

  const closeJobModal = () => {
    setIsJobModalOpen(false);
    setSelectedJob(null);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching candidate dashboard data...');
      
      const response = await dashboardService.getDashboardData();
      console.log('✅ Dashboard data received:', response);
      
      setDashboardData(response.data);
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'reviewed': return 'bg-blue-100 text-blue-800';
      case 'shortlisted': return 'bg-purple-100 text-purple-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'hired': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse h-80">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse h-80">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 rounded-lg">
            <Briefcase className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Candidate Dashboard</h1>
            <p className="text-gray-600">Track your job applications and discover new opportunities</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.totalApplications === 0 
                ? 'No applications yet' 
                : `${dashboardData.totalApplications} total ${dashboardData.totalApplications === 1 ? 'application' : 'applications'}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.applicationStatusCount.shortlisted}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.applicationStatusCount.shortlisted === 0
                ? 'Not shortlisted yet'
                : 'Applications in progress'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.availableJobs}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.availableJobs === 0
                ? 'No jobs available'
                : `${dashboardData.availableJobs} open ${dashboardData.availableJobs === 1 ? 'position' : 'positions'}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Application Status */}
      <Card>
        <CardHeader>
          <CardTitle>Application Status</CardTitle>
          <CardDescription>Breakdown of your job applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(dashboardData.applicationStatusCount).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className={`px-2 py-1 rounded-full text-xs mt-1 ${getStatusColor(status)}`}>
                  {status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Applications */}
        <Card>
          <CardHeader>
            <CardTitle>My Applications</CardTitle>
            <CardDescription>Your recent job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboardData.myApplications.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
                  <p className="text-gray-500 mb-4">Start applying to jobs to see them here</p>
                  <Button onClick={() => navigate('/jobs')}>
                    Browse Jobs
                  </Button>
                </div>
              ) : (
                <>
                  {dashboardData.myApplications.map((application) => (
                    <div key={application.id} className="flex items-center justify-between p-2 border-b">
                      <div>
                        <div className="font-medium">{application.jobs?.title || 'Position'}</div>
                        <div className="text-sm text-gray-500">{application.jobs?.department || 'Department'}</div>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(application.status)}`}>
                          {application.status}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{formatDate(application.created_at)}</div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4">
                    <Button variant="outline" className="w-full" onClick={() => navigate('/applications')}>
                      View All Applications
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Available Jobs</CardTitle>
            <CardDescription>Browse all open positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboardData.recommendedJobs.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs available</h3>
                  <p className="text-gray-500 mb-4">Check back later for new opportunities</p>
                </div>
              ) : (
                <>
                  {dashboardData.recommendedJobs.map((job) => (
                    <div key={job.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{job.title}</div>
                          <div className="text-sm text-gray-600 mt-1">{job.department}</div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {job.employment_type}
                            </span>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openJobModal(job)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="mt-4">
                    <Button variant="outline" className="w-full" onClick={() => navigate('/jobs')}>
                      <Search className="h-4 w-4 mr-2" />
                      Browse More Jobs
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Details Modal */}
      <Dialog open={isJobModalOpen} onOpenChange={setIsJobModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedJob.title}</DialogTitle>
                <DialogDescription>
                  {selectedJob.department} • {selectedJob.location}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {/* Job Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500">Location</div>
                      <div className="font-medium">{selectedJob.location}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500">Employment Type</div>
                      <div className="font-medium">{selectedJob.employment_type}</div>
                    </div>
                  </div>
                  {selectedJob.salary_range && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-xs text-gray-500">Salary Range</div>
                        <div className="font-medium">{selectedJob.salary_range}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-xs text-gray-500">Department</div>
                      <div className="font-medium">{selectedJob.department}</div>
                    </div>
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Job Description</h3>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {selectedJob.description || selectedJob.job_description || (
                      <div className="text-gray-500 italic">
                        <p>No detailed description available yet.</p>
                        <p className="mt-2">Please contact HR for more information about this position.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Requirements */}
                {(selectedJob.requirements || selectedJob.qualifications) && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Requirements</h3>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {selectedJob.requirements || selectedJob.qualifications}
                    </div>
                  </div>
                )}

                {/* Responsibilities */}
                {selectedJob.responsibilities && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Responsibilities</h3>
                    <div className="text-gray-700 whitespace-pre-wrap">
                      {selectedJob.responsibilities}
                    </div>
                  </div>
                )}

                {/* Posted Date */}
                <div className="text-sm text-gray-500">
                  Posted on {formatDate(selectedJob.created_at)}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      closeJobModal();
                      navigate(`/jobs`);
                    }}
                  >
                    Apply Now
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={closeJobModal}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upcoming Interviews */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Interviews</CardTitle>
          <CardDescription>Your scheduled interviews</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData.myApplications.filter(app => app.interview_date).length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming interviews</h3>
              <p className="text-gray-500 mb-4">You'll see your scheduled interviews here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboardData.myApplications
                .filter(app => app.interview_date)
                .sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date))
                .map((application) => {
                  const interviewDate = new Date(application.interview_date);
                  const dayName = interviewDate.toLocaleDateString('en-US', { weekday: 'long' });
                  const dateStr = interviewDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  });
                  
                  return (
                    <div key={application.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{application.jobs?.title || 'Position'}</h4>
                          <p className="text-sm text-gray-600 mt-1">{application.jobs?.department || 'Department'}</p>
                          
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">{dayName}, {dateStr}</span>
                            </div>
                            
                            {application.interview_time && (
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-green-600" />
                                <span>{application.interview_time}</span>
                              </div>
                            )}
                            
                            {application.interview_location && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-red-600" />
                                <span>{application.interview_location}</span>
                              </div>
                            )}
                            
                            {application.interview_notes && (
                              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                <p className="text-gray-700">{application.interview_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {application.status}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateDashboard;