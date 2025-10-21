import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Calendar, Clock, MapPin, Mail, Phone, FileText, Edit, X, User, Search } from 'lucide-react';
import { applicationService } from '../services/applicationService';
import { jobService } from '../services/jobService';
import { formatDate } from '../utils/helpers';

const Interviews = () => {
  const { user } = useAuth();
  const { isAdmin, isHR, isManager } = useRole();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, upcoming, past
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [interviewData, setInterviewData] = useState({
    interview_date: '',
    interview_time: '',
    interview_location: '',
    interview_notes: '',
    interview_grace_period_minutes: 10
  });
  const [jobsData, setJobsData] = useState([]);

  useEffect(() => {
    if (isAdmin || isHR) {
      fetchInterviews();
      fetchJobs();
    }
  }, [isAdmin, isHR]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const response = await applicationService.getAllApplications({ limit: 1000 });
      const applications = response.data?.applications || [];
      
      // Filter only applications with interview dates
      const scheduledInterviews = applications.filter(app => app.interview_date);
      setInterviews(scheduledInterviews);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await jobService.getAllJobs({ limit: 100 });
      setJobsData(response.data?.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleUpdateInterview = async () => {
    if (!selectedInterview) return;

    try {
      await applicationService.updateApplication(selectedInterview.id, interviewData);
      alert('Interview updated successfully!');
      setShowEditModal(false);
      setSelectedInterview(null);
      fetchInterviews();
    } catch (error) {
      console.error('Error updating interview:', error);
      alert('Failed to update interview');
    }
  };

  const getFilteredInterviews = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return interviews.filter(interview => {
      const interviewDate = new Date(interview.interview_date);
      interviewDate.setHours(0, 0, 0, 0);

      // Date filter
      let dateMatch = true;
      switch (filter) {
        case 'today':
          dateMatch = interviewDate.getTime() === today.getTime();
          break;
        case 'upcoming':
          dateMatch = interviewDate > today;
          break;
        case 'past':
          dateMatch = interviewDate < today;
          break;
        default:
          dateMatch = true;
      }

      // Search filter (candidate name or email)
      const searchMatch = searchTerm === '' || 
        (interview.candidate_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (interview.candidate_email || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Position filter
      const job = jobsData.find(j => j.id === interview.job_id);
      const positionMatch = positionFilter === 'all' || 
        (interview.job_title === positionFilter) ||
        (job?.title === positionFilter);

      return dateMatch && searchMatch && positionMatch;
    }).sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date));
  };

  // Get unique positions for filter dropdown
  const uniquePositions = [...new Set(interviews.map(interview => {
    const job = jobsData.find(j => j.id === interview.job_id);
    return interview.job_title || job?.title || 'Unknown Position';
  }))].sort();

  const filteredInterviews = getFilteredInterviews();

  // Access control - Only Admin and HR can access this page
  if (!isAdmin && !isHR) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
              <p className="text-sm text-gray-500">
                Only Admin and HR can access the Interviews page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Interviews</h1>
            <p className="text-gray-600">Manage and track all scheduled candidate interviews</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('all')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviews.length}</div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-blue-300" 
          onClick={() => setFilter('today')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {interviews.filter(i => {
                const iDate = new Date(i.interview_date);
                const today = new Date();
                return iDate.toDateString() === today.toDateString();
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-green-300" 
          onClick={() => setFilter('upcoming')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {interviews.filter(i => new Date(i.interview_date) > new Date()).length}
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-gray-300" 
          onClick={() => setFilter('past')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Past</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {interviews.filter(i => new Date(i.interview_date) < new Date()).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Section */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Date Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            All ({interviews.length})
          </Button>
          <Button
            variant={filter === 'today' ? 'default' : 'outline'}
            onClick={() => setFilter('today')}
            size="sm"
            className={filter === 'today' ? 'bg-blue-600' : ''}
          >
            Today
          </Button>
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setFilter('upcoming')}
            size="sm"
            className={filter === 'upcoming' ? 'bg-green-600' : ''}
          >
            Upcoming
          </Button>
          <Button
            variant={filter === 'past' ? 'default' : 'outline'}
            onClick={() => setFilter('past')}
            size="sm"
          >
            Past
          </Button>
        </div>

        {/* Search and Position Filter */}
        <div className="flex gap-2 flex-1">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search candidate name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Positions</option>
            {uniquePositions.map((position, index) => (
              <option key={index} value={position}>
                {position}
              </option>
            ))}
          </select>
          {(searchTerm || positionFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setPositionFilter('all');
              }}
              className="text-gray-600"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Interviews List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'all' && 'All Scheduled Interviews'}
            {filter === 'today' && "Today's Interviews"}
            {filter === 'upcoming' && 'Upcoming Interviews'}
            {filter === 'past' && 'Past Interviews'}
          </CardTitle>
          <CardDescription>
            {filteredInterviews.length} interview{filteredInterviews.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredInterviews.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No interviews found</h3>
              <p className="text-gray-500">
                {filter === 'today' && 'No interviews scheduled for today'}
                {filter === 'upcoming' && 'No upcoming interviews scheduled'}
                {filter === 'past' && 'No past interviews found'}
                {filter === 'all' && 'No interviews have been scheduled yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterviews.map((interview) => {
                    const interviewDate = new Date(interview.interview_date);
                    const today = new Date();
                    const isToday = interviewDate.toDateString() === today.toDateString();
                    const isPast = interviewDate < today && !isToday;
                    const job = jobsData.find(j => j.id === interview.job_id);

                    return (
                      <TableRow 
                        key={interview.id}
                        className={
                          isToday 
                            ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                            : isPast 
                            ? 'bg-gray-50' 
                            : ''
                        }
                      >
                        {/* Candidate */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {(interview.candidate_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 flex items-center gap-2">
                                {interview.candidate_name || 'Unknown'}
                                {isToday && (
                                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                                    TODAY
                                  </span>
                                )}
                                {isPast && (
                                  <span className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded-full">
                                    PAST
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {interview.candidate_email || 'No email'}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Position */}
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {interview.job_title || job?.title || 'Unknown Position'}
                          </div>
                          {job?.department && (
                            <div className="text-xs text-gray-500">{job.department}</div>
                          )}
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <div className="text-sm">
                            {interviewDate.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </TableCell>

                        {/* Time */}
                        <TableCell>
                          {interview.interview_time ? (
                            <div className="text-sm font-medium">{interview.interview_time}</div>
                          ) : (
                            <span className="text-xs text-gray-400">Not set</span>
                          )}
                        </TableCell>

                        {/* Location */}
                        <TableCell>
                          {interview.interview_location ? (
                            <div className="text-sm">{interview.interview_location}</div>
                          ) : (
                            <span className="text-xs text-gray-400">Not set</span>
                          )}
                        </TableCell>

                        {/* Notes */}
                        <TableCell>
                          {interview.interview_notes ? (
                            <div className="text-xs text-gray-600 max-w-xs truncate" title={interview.interview_notes}>
                              {interview.interview_notes}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInterview(interview);
                              setInterviewData({
                                interview_date: interview.interview_date || '',
                                interview_time: interview.interview_time || '',
                                interview_location: interview.interview_location || '',
                                interview_notes: interview.interview_notes || '',
                                interview_grace_period_minutes: interview.interview_grace_period_minutes || 10
                              });
                              setShowEditModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Interview Modal */}
      {showEditModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Edit Interview</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedInterview(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Candidate:</strong> {selectedInterview.candidate_name || 'Unknown'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  <strong>Position:</strong> {selectedInterview.job_title || 'Unknown Position'}
                </p>
              </div>

              <div>
                <Label htmlFor="interview_date">Interview Date *</Label>
                <Input
                  id="interview_date"
                  type="date"
                  value={interviewData.interview_date}
                  onChange={(e) => setInterviewData({ ...interviewData, interview_date: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="interview_time">Interview Time</Label>
                <Input
                  id="interview_time"
                  type="time"
                  value={interviewData.interview_time}
                  onChange={(e) => setInterviewData({ ...interviewData, interview_time: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="interview_location">Interview Location</Label>
                <Input
                  id="interview_location"
                  type="text"
                  placeholder="e.g., Office, Virtual (Zoom), Phone"
                  value={interviewData.interview_location}
                  onChange={(e) => setInterviewData({ ...interviewData, interview_location: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="interview_notes">Additional Notes</Label>
                <textarea
                  id="interview_notes"
                  rows="3"
                  placeholder="Any special instructions or information..."
                  value={interviewData.interview_notes}
                  onChange={(e) => setInterviewData({ ...interviewData, interview_notes: e.target.value })}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="interview_grace_period_minutes">Interview Grace Period (minutes)</Label>
                <Input
                  id="interview_grace_period_minutes"
                  type="number"
                  min="0"
                  max="60"
                  value={interviewData.interview_grace_period_minutes}
                  onChange={(e) => setInterviewData({ ...interviewData, interview_grace_period_minutes: parseInt(e.target.value) || 10 })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Candidates can join up to this many minutes after the scheduled start time
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleUpdateInterview}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Update Interview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedInterview(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interviews;
