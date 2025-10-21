import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Briefcase, FileText, Users, TrendingUp, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import dashboardService from '../../services/dashboardService';
import { jobService } from '../../services/jobService';
import { formatDate } from '../../utils/helpers';
import { DEPARTMENTS } from '../../utils/constants';

const HRDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalJobs: 0,
    totalApplications: 0,
    applicationStats: {
      pending: 0,
      reviewed: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0
    },
    recentApplications: [],
    jobsByDepartmentData: [],
    applicationFunnelData: []
  });
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({
    jobId: 'all',
    department: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

  const fetchJobs = async () => {
    try {
      const response = await jobService.getAllJobs();
      if (response.success && response.data) {
        setJobs(response.data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching HR dashboard data with filters:', filters);
      const response = await dashboardService.getHRDashboard(filters);
      console.log('✅ HR dashboard response:', response);
      
      if (response.success && response.data) {
        console.log(' Setting HR dashboard data:', response.data);
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error(' Error fetching HR dashboard:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // Use real data from API
  const applicationFunnelData = dashboardData.applicationFunnelData || [];
  const jobsByDepartmentData = dashboardData.jobsByDepartmentData || [];
  const recentApplications = dashboardData.recentApplications || [];

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
              <p className="text-gray-600">Overview of recruitment and hiring metrics</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filter Dashboard Data</CardTitle>
            <CardDescription>Filter metrics by job posting or department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Job Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Filter by Job Posting
                </label>
                <select
                  value={filters.jobId}
                  onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Job Postings</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Filter by Department
                </label>
                <select
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Departments</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(filters.jobId !== 'all' || filters.department !== 'all') && (
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                {filters.jobId !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    Job: {jobs.find(j => j.id === filters.jobId)?.title || 'Selected'}
                    <button
                      onClick={() => setFilters({ ...filters, jobId: 'all' })}
                      className="ml-1 hover:text-purple-900"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.department !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Department: {filters.department}
                    <button
                      onClick={() => setFilters({ ...filters, department: 'all' })}
                      className="ml-1 hover:text-blue-900"
                    >
                      ×
                    </button>
                  </span>
                )}
                <button
                  onClick={() => setFilters({ jobId: 'all', department: 'all' })}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Clear All
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Key HR Metrics - Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalJobs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active job postings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalApplications || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time applications
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.applicationStats.shortlisted || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready for interview
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hired</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.applicationStats.hired || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully hired
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardData.applicationStats.rejected || 0}</div>
            <p className="text-xs text-muted-foreground">
              Applications declined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Funnel</CardTitle>
            <CardDescription>Conversion rate through hiring stages</CardDescription>
          </CardHeader>
          <CardContent>
            {applicationFunnelData.length > 0 && applicationFunnelData.some(d => d.value > 0) ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={applicationFunnelData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {applicationFunnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3">
                  {applicationFunnelData.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-sm font-medium">{entry.name}</span>
                      <span className="text-sm text-gray-600">({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                <FileText className="h-12 w-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium">No Applications Yet</p>
                <p className="text-xs text-gray-400 mt-1">Applications will appear here once candidates apply</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Jobs by Department</CardTitle>
            <CardDescription>Open vs filled positions by department</CardDescription>
          </CardHeader>
          <CardContent>
            {jobsByDepartmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={jobsByDepartmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="open" fill="#8884d8" name="Open" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="filled" fill="#82ca9d" name="Filled" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No job data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <CardDescription>Latest job applications received</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Position</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Applied Date</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.length > 0 ? (
                  recentApplications.map((application) => (
                    <tr key={application.id} className="border-b">
                      <td className="p-2">
                        <div>
                          <div className="font-medium">
                            {application.candidate?.name || 'Unknown Candidate'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {application.candidate?.email || ''}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        {application.jobs?.title || 'N/A'}
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(application.status)}`}>
                          {application.status}
                        </span>
                      </td>
                      <td className="p-2">{formatDate(application.created_at)}</td>
                      <td className="p-2">
                        <button 
                          className="text-blue-600 hover:underline"
                          onClick={() => window.location.href = `/applications?id=${application.id}`}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-500">
                      No applications found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRDashboard;