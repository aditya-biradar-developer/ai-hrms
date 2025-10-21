import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Briefcase, Plus, Edit, Trash2, Calendar, MapPin, Sparkles, Loader2, Clock, DollarSign, FileText } from 'lucide-react';
import { jobService } from '../services/jobService';
import { formatDate } from '../utils/helpers';
import { DEPARTMENTS } from '../utils/constants';
import api from '../services/api';

const Jobs = () => {
  const { user } = useAuth();
  const { isAdmin, isHR, isCandidate } = useRole();
  const location = useLocation();
  const [jobsData, setJobsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: DEPARTMENTS[0],
    posted_date: new Date().toISOString().split('T')[0],
    last_date_to_apply: '',
    vacancies: 1
  });
  const [stats, setStats] = useState({
    totalJobs: 0,
    jobsByDepartment: {}
  });
  const [error, setError] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [userApplications, setUserApplications] = useState([]);

  useEffect(() => {
    fetchJobs();
    if (isAdmin || isHR) {
      fetchStats();
    }
    if (isCandidate) {
      fetchUserApplications();
    }
  }, []);

  const fetchUserApplications = async () => {
    try {
      const response = await api.get('/applications/candidate/' + user.id);
      setUserApplications(response.data.data.applications || []);
    } catch (error) {
      console.error('Error fetching user applications:', error);
    }
  };

  const hasApplied = (jobId) => {
    return userApplications.some(app => app.job_id === jobId);
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await jobService.getAllJobs({ limit: 100 });
      let jobs = response.data.jobs || [];
      
      // For candidates, only show open jobs
      if (isCandidate) {
        jobs = jobs.filter(job => job.status === 'open' || !job.status);
        console.log(`📋 Showing ${jobs.length} open positions for candidate`);
      }
      
      setJobsData(jobs);
      
      // Check if coming from dashboard with a specific job ID
      const selectedJobId = location.state?.selectedJobId;
      
      if (jobs.length > 0) {
        if (selectedJobId) {
          // Find and select the job from dashboard
          const jobToSelect = jobs.find(job => job.id === selectedJobId);
          setSelectedJob(jobToSelect || jobs[0]);
        } else if (!selectedJob) {
          // Auto-select first job for all users
          setSelectedJob(jobs[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await jobService.getJobStats();
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmitJob = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingJob) {
        await jobService.updateJob(editingJob.id, formData);
      } else {
        await jobService.createJob(formData);
      }
      
      setShowJobForm(false);
      setEditingJob(null);
      fetchJobs();
      if (isAdmin || isHR) {
        fetchStats();
      }
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        department: DEPARTMENTS[0],
        posted_date: new Date().toISOString().split('T')[0],
        last_date_to_apply: '',
        vacancies: 1
      });
    } catch (error) {
      console.error('Error saving job:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.details?.join(', ') || 'Failed to save job';
      setError(errorMsg);
    }
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      description: job.description,
      department: job.department || DEPARTMENTS[0],
      posted_date: job.posted_date || new Date().toISOString().split('T')[0],
      last_date_to_apply: job.last_date_to_apply || '',
      vacancies: job.vacancies || 1
    });
    setShowJobForm(true);
  };

  const handleDeleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobService.deleteJob(jobId);
        fetchJobs();
        fetchStats();
      } catch (error) {
        console.error('Error deleting job:', error);
      }
    }
  };

  const handleApplyJob = (jobId) => {
    window.location.href = `/applications?apply=${jobId}`;
  };

  const handleGenerateWithAI = async () => {
    if (!formData.title || formData.title.trim().length < 3) {
      alert('Please enter a job title first (at least 3 characters)');
      return;
    }

    try {
      setAiGenerating(true);
      console.log('🤖 Generating job description for:', formData.title);

      const response = await api.post('/ai/job-description/generate', {
        title: formData.title,
        department: formData.department,
        skills: [], // You can add skills input later
        experience_level: 'mid',
        employment_type: 'full-time'
      });

      console.log('✅ AI Generated:', response.data);

      // Update the description field with AI-generated content
      setFormData(prev => ({
        ...prev,
        description: response.data.data.full_description
      }));

    } catch (error) {
      console.error('❌ AI generation failed:', error);
      alert('AI generation failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse h-64">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ overflowX: 'clip' }}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Briefcase className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
              <p className="text-gray-600">
                {isAdmin || isHR ? 'Manage job postings' : 'Browse available positions'}
              </p>
            </div>
          </div>
        </div>
        {(isAdmin || isHR) && (
          <Button onClick={() => setShowJobForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Post Job
          </Button>
        )}
      </div>

      {/* Stats Cards - Only for Admin and HR */}
      {(isAdmin || isHR) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jobs by Department</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(stats.jobsByDepartment).map(([dept, count]) => (
                  <div key={dept} className="flex justify-between text-sm">
                    <span>{dept}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Split View for All Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Jobs List (Sticky) */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]">
            <Card>
            <CardHeader>
              <CardTitle>{isCandidate ? 'Available Positions' : 'All Job Postings'}</CardTitle>
              <CardDescription>
                {jobsData.length} {jobsData.length === 1 ? 'open position' : 'open positions'}
                {isCandidate && ' accepting applications'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[calc(100vh-16rem)] overflow-y-auto">
                    {jobsData.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className={`p-4 border-b cursor-pointer transition-colors ${
                          selectedJob?.id === job.id
                            ? 'bg-blue-50 border-l-4 border-l-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-sm">{job.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            job.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {job.status || 'open'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{job.department}</p>
                        <div className="space-y-1 mt-2">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span>{job.location || 'Remote'}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Briefcase className="h-3 w-3" />
                            <span>{job.vacancies || 1} {job.vacancies === 1 ? 'position' : 'positions'}</span>
                          </div>
                          {job.last_date_to_apply && (() => {
                            const today = new Date();
                            const deadline = new Date(job.last_date_to_apply);
                            const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
                            const isUrgent = daysLeft <= 2 && daysLeft >= 0;
                            
                            // Format as DD/MM/YYYY
                            const day = deadline.getDate().toString().padStart(2, '0');
                            const month = (deadline.getMonth() + 1).toString().padStart(2, '0');
                            const year = deadline.getFullYear();
                            const formattedDate = `${day}/${month}/${year}`;
                            
                            return (
                              <div className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                <Clock className="h-3 w-3" />
                                <span>Apply by: {formattedDate}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Right Side - Job Details (Scrollable) */}
          <main className="lg:col-span-2">
            {selectedJob ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl break-words">{selectedJob.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedJob.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Posted {formatDate(selectedJob.posted_date || selectedJob.created_at)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Job Overview */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-xs text-gray-500">Location</div>
                        <div className="font-medium">{selectedJob.location || 'Remote'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-xs text-gray-500">Employment Type</div>
                        <div className="font-medium">{selectedJob.employment_type || 'Full-time'}</div>
                      </div>
                    </div>
                    {selectedJob.salary_range && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="text-xs text-gray-500">Salary Range</div>
                          <div className="font-medium">{selectedJob.salary_range}</div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-xs text-gray-500">Department</div>
                        <div className="font-medium">{selectedJob.department}</div>
                      </div>
                    </div>
                  </div>

                  {/* Job Description */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Job Description
                    </h3>
                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
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
                      <h3 className="font-semibold text-lg mb-3">Requirements</h3>
                      <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedJob.requirements || selectedJob.qualifications}
                      </div>
                    </div>
                  )}

                  {/* Responsibilities */}
                  {selectedJob.responsibilities && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Responsibilities</h3>
                      <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedJob.responsibilities}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 border-t flex gap-2">
                    {isCandidate ? (
                      hasApplied(selectedJob.id) ? (
                        <Button 
                          size="lg" 
                          className="w-full"
                          disabled
                          variant="outline"
                        >
                          ✓ Already Applied
                        </Button>
                      ) : (
                        <Button 
                          size="lg" 
                          className="w-full"
                          onClick={() => handleApplyJob(selectedJob.id)}
                        >
                          Apply for this Position
                        </Button>
                      )
                    ) : (
                      <>
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEditJob(selectedJob)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Job
                        </Button>
                        <Button 
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleDeleteJob(selectedJob.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Job
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Job</h3>
                  <p className="text-gray-500">Click on a job from the list to view details</p>
                </CardContent>
              </Card>
            )}
          </main>
        </div>

      {/* Add/Edit Job Modal */}
      {showJobForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingJob ? 'Edit Job' : 'Post New Job'}</CardTitle>
              <CardDescription>
                {editingJob ? 'Update the job details' : 'Create a new job posting'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitJob} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g. Senior Frontend Developer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    required
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="posted_date">Posted Date</Label>
                    <Input
                      id="posted_date"
                      type="date"
                      value={formData.posted_date}
                      onChange={(e) => setFormData({...formData, posted_date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_date_to_apply">Last Date to Apply</Label>
                    <Input
                      id="last_date_to_apply"
                      type="date"
                      value={formData.last_date_to_apply}
                      onChange={(e) => setFormData({...formData, last_date_to_apply: e.target.value})}
                      min={formData.posted_date}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vacancies">Vacancies</Label>
                    <Input
                      id="vacancies"
                      type="number"
                      min="1"
                      value={formData.vacancies}
                      onChange={(e) => setFormData({...formData, vacancies: parseInt(e.target.value) || 1})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="description">Job Description</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateWithAI}
                      disabled={aiGenerating || !formData.title}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600"
                    >
                      {aiGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Provide a detailed job description... or click 'Generate with AI'"
                    rows={8}
                    required
                  />
                  {aiGenerating && (
                    <p className="text-xs text-purple-600">
                      🤖 AI is crafting a professional job description...
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" className="flex-1">
                    {editingJob ? 'Update Job' : 'Post Job'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowJobForm(false);
                      setEditingJob(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
};

export default Jobs;