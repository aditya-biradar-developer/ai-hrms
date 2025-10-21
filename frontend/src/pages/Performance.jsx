import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import { Star, TrendingUp, Plus, Edit, Rocket, DollarSign, BookOpen, AlertTriangle, CheckCircle2, Circle, BarChart3, Zap, MessageCircle, Users, Lightbulb, Clock, Filter, X } from 'lucide-react';
import { performanceService } from '../services/performanceService';
import { userService } from '../services/userService';
import { formatDate } from '../utils/helpers';

const Performance = () => {
  const { user } = useAuth();
  const { isAdmin, isManager, isHR } = useRole();
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formData, setFormData] = useState({
    user_id: '',
    review_period_start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    review_period_end: new Date().toISOString().split('T')[0],
    
    // Core Metrics (1-5 rating) - Default to 4 for faster filling
    quality_of_work: 4,
    productivity: 4,
    communication: 4,
    teamwork: 4,
    problem_solving: 4,
    initiative: 4,
    attendance_punctuality: 4,
    
    // Goal Tracking
    previous_goals_completion: '',
    goals: '',
    
    // Comments & Feedback
    achievements: '',
    areas_of_improvement: '',
    manager_comments: '',
    employee_self_assessment: '',
    
    // Final Evaluation
    overall_rating: 4,
    recommendation: 'none', // none, promotion, bonus, training
    status: 'draft' // draft, submitted, completed
  });
  const [activeTab, setActiveTab] = useState('basic'); // basic, ratings, feedback
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [viewingReview, setViewingReview] = useState(null);
  const [filters, setFilters] = useState({
    employee: '',
    status: '',
    rating: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchPerformance();
    fetchStats();
    if (isAdmin || isManager || isHR) {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      console.log('📋 Fetching users for performance review...', { isAdmin, isManager, isHR });
      
      // Backend now handles filtering for managers
      const response = await userService.getAllUsers({ limit: 1000 });
      let allUsers = response.data.users || [];
      
      // Filter to show only employees (exclude HR, admin roles)
      const reviewableUsers = allUsers.filter(u => 
        u.role !== 'admin' && u.role !== 'hr' && u.id !== user.id
      );
      
      console.log('✅ Reviewable users:', reviewableUsers.length, 'out of', allUsers.length);
      setUsers(reviewableUsers);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching performance data...', { isAdmin, isManager, isHR });
      
      const userId = isAdmin || isManager || isHR ? null : user.id;
      const response = isAdmin || isManager || isHR
        ? await performanceService.getAllPerformance({ limit: 100 })
        : await performanceService.getPerformanceByUserId(user.id, { limit: 100 });
      
      console.log('✅ Performance data fetched:', response.data.performance?.length, 'reviews');
      const reviews = response.data.performance || [];
      setPerformanceData(reviews);
    } catch (error) {
      console.error('❌ Error fetching performance:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('📈 Fetching performance stats...', { isAdmin, isManager, isHR });
      
      const userId = isAdmin || isManager || isHR ? null : user.id;
      // Don't filter by date - get all reviews for accurate stats
      const response = await performanceService.getPerformanceStats({ 
        userId
      });
      
      console.log('✅ Stats fetched:', response.data.stats);
      setStats(response.data.stats || stats);
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      console.log('Submitting performance review:', formData);
      
      if (editingReview) {
        await performanceService.updatePerformance(editingReview.id, formData);
      } else {
        await performanceService.createPerformance(formData);
      }
      
      setShowReviewForm(false);
      setEditingReview(null);
      fetchPerformance();
      fetchStats();
      
      // Reset form
      setFormData({
        user_id: '',
        review_period_start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        review_period_end: new Date().toISOString().split('T')[0],
        quality_of_work: 3,
        productivity: 3,
        communication: 3,
        teamwork: 3,
        problem_solving: 3,
        initiative: 3,
        attendance_punctuality: 3,
        previous_goals_completion: '',
        goals: '',
        achievements: '',
        areas_of_improvement: '',
        manager_comments: '',
        employee_self_assessment: '',
        overall_rating: 3,
        recommendation: 'none',
        status: 'draft'
      });
    } catch (error) {
      console.error('Error saving performance review:', error);
      console.error('Full error details:', error.response?.data);
      console.error('Validation details:', error.response?.data?.details);
      
      const errorMsg = error.response?.data?.details?.join(', ') || error.response?.data?.message || 'Failed to save review';
      setError(errorMsg);
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setFormData({
      user_id: review.user_id,
      review_period_start: review.review_period_start,
      review_period_end: review.review_period_end,
      quality_of_work: review.quality_of_work || 3,
      productivity: review.productivity || 3,
      communication: review.communication || 3,
      teamwork: review.teamwork || 3,
      problem_solving: review.problem_solving || 3,
      initiative: review.initiative || 3,
      attendance_punctuality: review.attendance_punctuality || 3,
      previous_goals_completion: review.previous_goals_completion || '',
      goals: review.goals || '',
      achievements: review.achievements || '',
      areas_of_improvement: review.areas_of_improvement || '',
      manager_comments: review.manager_comments || '',
      employee_self_assessment: review.employee_self_assessment || '',
      overall_rating: review.overall_rating || 3,
      recommendation: review.recommendation || 'none',
      status: review.status || 'draft'
    });
    setShowReviewForm(true);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  // Filter performance data based on filters
  const filteredPerformanceData = performanceData.filter(review => {
    // Employee filter
    if (filters.employee && review.user_id !== filters.employee) {
      return false;
    }
    
    // Status filter
    if (filters.status && review.status !== filters.status) {
      return false;
    }
    
    // Rating filter (minimum rating)
    if (filters.rating && review.overall_rating < parseInt(filters.rating)) {
      return false;
    }
    
    // Date range filter
    if (filters.startDate && new Date(review.review_period_start) < new Date(filters.startDate)) {
      return false;
    }
    if (filters.endDate && new Date(review.review_period_end) > new Date(filters.endDate)) {
      return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
        <Card className="animate-pulse h-96">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Performance</h1>
              <p className="text-gray-600">Track and manage employee performance reviews</p>
            </div>
          </div>
        </div>
        {(isAdmin || isManager || isHR) && (
          <Button onClick={() => setShowReviewForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Review
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReviews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              {renderStars(Math.round(stats.averageRating))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating Distribution</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(stats.ratingDistribution).map(([rating, count]) => (
                <div key={rating} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span>{rating} star</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance Reviews</CardTitle>
              <CardDescription>
                {isAdmin || isManager || isHR ? 'All performance reviews' : 'Your performance reviews'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters Section */}
          {showFilters && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Filter Reviews</h3>
                <span className="text-sm text-gray-600">
                  Showing {filteredPerformanceData.length} of {performanceData.length} reviews
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {(isAdmin || isManager || isHR) && (
                  <div className="space-y-2">
                    <Label htmlFor="filter-employee" className="text-sm font-medium">Employee</Label>
                    <select
                      id="filter-employee"
                      value={filters.employee}
                      onChange={(e) => setFilters({...filters, employee: e.target.value})}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">All Employees</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="filter-status" className="text-sm font-medium">Status</Label>
                  <select
                    id="filter-status"
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-rating" className="text-sm font-medium">Min Rating</Label>
                  <select
                    id="filter-rating"
                    value={filters.rating}
                    onChange={(e) => setFilters({...filters, rating: e.target.value})}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">All Ratings</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="3">3+ Stars</option>
                    <option value="2">2+ Stars</option>
                    <option value="1">1+ Stars</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-start" className="text-sm font-medium">From Date</Label>
                  <Input
                    id="filter-start"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-end" className="text-sm font-medium">To Date</Label>
                  <Input
                    id="filter-end"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ employee: '', status: '', rating: '', startDate: '', endDate: '' })}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                {(isAdmin || isManager || isHR) && <TableHead>Employee</TableHead>}
                <TableHead>Review Period</TableHead>
                <TableHead>Overall Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recommendation</TableHead>
                {(isAdmin || isManager || isHR) && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPerformanceData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin || isManager || isHR ? 6 : 4} className="text-center py-8 text-gray-500">
                    {performanceData.length === 0 
                      ? 'No performance reviews found. Click "Add Review" to create one.'
                      : 'No reviews match the selected filters. Try adjusting your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPerformanceData.map((review) => (
                  <TableRow key={review.id}>
                    {(isAdmin || isManager || isHR) && (
                      <TableCell>
                        <div>
                          <div className="font-medium">{review.employee_name || 'Unknown Employee'}</div>
                          <div className="text-sm text-gray-500">{review.employee_email || ''}</div>
                          {review.employee_department && (
                            <div className="text-xs text-gray-400">{review.employee_department}</div>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(review.review_period_start)}</div>
                        <div className="text-gray-500">to {formatDate(review.review_period_end)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {renderStars(review.overall_rating || 0)}
                        <span className="text-sm font-medium">{review.overall_rating || 'N/A'}/5</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        review.status === 'completed' ? 'bg-green-100 text-green-800' :
                        review.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {review.status || 'draft'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        review.recommendation === 'promotion' ? 'bg-purple-100 text-purple-800' :
                        review.recommendation === 'bonus' ? 'bg-yellow-100 text-yellow-800' :
                        review.recommendation === 'training' ? 'bg-blue-100 text-blue-800' :
                        review.recommendation === 'pip' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        <span className="flex items-center gap-1">
                          {review.recommendation === 'none' ? <><Circle className="w-3 h-3" /> No Action</> :
                           review.recommendation === 'promotion' ? <><Rocket className="w-3 h-3" /> Promotion</> :
                           review.recommendation === 'bonus' ? <><DollarSign className="w-3 h-3" /> Bonus</> :
                           review.recommendation === 'training' ? <><BookOpen className="w-3 h-3" /> Training</> :
                           review.recommendation === 'pip' ? <><AlertTriangle className="w-3 h-3" /> Needs Improvement</> :
                           <><Circle className="w-3 h-3" /> No Action</>}
                        </span>
                      </span>
                    </TableCell>
                    {(isAdmin || isManager || isHR) && (
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setViewingReview(review)}
                          >
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditReview(review)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Review Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle>{editingReview ? 'Edit Performance Review' : 'Add Performance Review'}</CardTitle>
                <CardDescription>
                  {editingReview ? 'Update the performance review details' : 'Add a new performance review'}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowReviewForm(false);
                  setEditingReview(null);
                  setActiveTab('basic');
                }}
                className="h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitReview} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">
                    {error}
                  </div>
                )}
                
                {/* Quick Navigation Tabs */}
                <div className="flex space-x-2 border-b">
                  <button
                    type="button"
                    onClick={() => setActiveTab('basic')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === 'basic'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    1. Basic Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ratings')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === 'ratings'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    2. Quick Ratings
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('feedback')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === 'feedback'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    3. Feedback (Optional)
                  </button>
                </div>

                {/* Tab 1: Basic Information */}
                {activeTab === 'basic' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  {(isAdmin || isManager || isHR) && (
                    <div className="space-y-2">
                      <Label htmlFor="user_id">Employee *</Label>
                      <select
                        id="user_id"
                        value={formData.user_id}
                        onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        required
                      >
                        <option value="">Select an employee...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email}) - {u.department}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="review_period_start">Review Period Start *</Label>
                      <Input
                        id="review_period_start"
                        type="date"
                        value={formData.review_period_start}
                        onChange={(e) => setFormData({...formData, review_period_start: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="review_period_end">Review Period End *</Label>
                      <Input
                        id="review_period_end"
                        type="date"
                        value={formData.review_period_end}
                        onChange={(e) => setFormData({...formData, review_period_end: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={() => setActiveTab('ratings')}>
                      Next: Ratings →
                    </Button>
                  </div>
                </div>
                )}

                {/* Tab 2: Quick Ratings */}
                {activeTab === 'ratings' && (isAdmin || isManager || isHR) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Quick Performance Ratings</h3>
                      <div className="text-sm text-gray-500">Adjust sliders as needed (Default: 4/5)</div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { key: 'quality_of_work', label: 'Quality of Work', Icon: BarChart3 },
                        { key: 'productivity', label: 'Productivity', Icon: Zap },
                        { key: 'communication', label: 'Communication', Icon: MessageCircle },
                        { key: 'teamwork', label: 'Teamwork', Icon: Users },
                        { key: 'problem_solving', label: 'Problem Solving', Icon: Lightbulb },
                        { key: 'initiative', label: 'Initiative', Icon: Rocket },
                        { key: 'attendance_punctuality', label: 'Attendance', Icon: Clock }
                      ].map(({ key, label, Icon }) => (
                        <div key={key} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          <Icon className="w-5 h-5 text-blue-600" />
                          <Label htmlFor={key} className="flex-1 font-medium">{label}</Label>
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              id={key}
                              min="1"
                              max="5"
                              value={formData[key]}
                              onChange={(e) => setFormData({...formData, [key]: parseInt(e.target.value)})}
                              className="w-32"
                            />
                            <div className="flex items-center space-x-1 min-w-[100px]">
                              {renderStars(formData[key])}
                              <span className="text-sm font-bold">{formData[key]}/5</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Overall Rating */}
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <Label htmlFor="overall_rating" className="text-base font-semibold">Overall Rating *</Label>
                      <div className="flex items-center space-x-3 mt-2">
                        <input
                          type="range"
                          id="overall_rating"
                          min="1"
                          max="5"
                          value={formData.overall_rating}
                          onChange={(e) => setFormData({...formData, overall_rating: parseInt(e.target.value)})}
                          className="flex-1"
                        />
                        <div className="flex items-center space-x-1 min-w-[150px]">
                          {renderStars(formData.overall_rating)}
                          <span className="text-lg font-bold">{formData.overall_rating}/5</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between pt-4">
                      <Button type="button" variant="outline" onClick={() => setActiveTab('basic')}>
                        ← Back
                      </Button>
                      <Button type="button" onClick={() => setActiveTab('feedback')}>
                        Next: Feedback →
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tab 3: Feedback (Optional) */}
                {activeTab === 'feedback' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Feedback & Comments</h3>
                    <span className="text-sm text-gray-500 italic">(All fields optional)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="achievements" className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Key Achievements
                      </Label>
                      <Textarea
                        id="achievements"
                        value={formData.achievements}
                        onChange={(e) => setFormData({...formData, achievements: e.target.value})}
                        placeholder="Major accomplishments..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="areas_of_improvement" className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Areas to Improve
                      </Label>
                      <Textarea
                        id="areas_of_improvement"
                        value={formData.areas_of_improvement}
                        onChange={(e) => setFormData({...formData, areas_of_improvement: e.target.value})}
                        placeholder="Growth opportunities..."
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="goals" className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Goals for Next Period
                    </Label>
                    <Textarea
                      id="goals"
                      value={formData.goals}
                      onChange={(e) => setFormData({...formData, goals: e.target.value})}
                      placeholder="Set goals for next review..."
                      rows={2}
                    />
                  </div>
                  {(isAdmin || isManager || isHR) && (
                    <div className="space-y-2">
                      <Label htmlFor="manager_comments" className="flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        Manager/HR Comments
                      </Label>
                      <Textarea
                        id="manager_comments"
                        value={formData.manager_comments}
                        onChange={(e) => setFormData({...formData, manager_comments: e.target.value})}
                        placeholder="Overall feedback..."
                        rows={2}
                      />
                    </div>
                  )}
                  
                  {(isAdmin || isManager || isHR) && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="recommendation" className="flex items-center gap-2">
                          <Rocket className="w-4 h-4" />
                          Recommendation
                        </Label>
                        <select
                          id="recommendation"
                          value={formData.recommendation}
                          onChange={(e) => setFormData({...formData, recommendation: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="none">No Action Required</option>
                          <option value="promotion">Ready for Promotion</option>
                          <option value="bonus">Deserves Bonus/Reward</option>
                          <option value="training">Needs Training/Development</option>
                          <option value="pip">Performance Improvement Plan (PIP)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          {formData.recommendation === 'pip' && <><AlertTriangle className="w-3 h-3" /> PIP: Formal plan to address performance issues</>}
                          {formData.recommendation === 'promotion' && <><Rocket className="w-3 h-3" /> Employee is ready for advancement</>}
                          {formData.recommendation === 'bonus' && <><DollarSign className="w-3 h-3" /> Exceptional performance deserves recognition</>}
                          {formData.recommendation === 'training' && <><BookOpen className="w-3 h-3" /> Additional skills development recommended</>}
                          {formData.recommendation === 'none' && <><CheckCircle2 className="w-3 h-3" /> Standard performance, no special action needed</>}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Review Status</Label>
                        <select
                          id="status"
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value})}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="draft">Draft</option>
                          <option value="submitted">Submitted</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </>
                  )}
                
                <div className="flex justify-between pt-4 border-t">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setActiveTab('ratings')}
                  >
                    ← Back
                  </Button>
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowReviewForm(false);
                        setEditingReview(null);
                        setActiveTab('basic');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingReview ? 'Update Review' : 'Add Review'}
                    </Button>
                  </div>
                </div>
                </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Review Details Modal */}
      {viewingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Performance Review Details</CardTitle>
              <CardDescription>
                Review Period: {formatDate(viewingReview.review_period_start)} - {formatDate(viewingReview.review_period_end)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Core Metrics */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Core Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Quality of Work', value: viewingReview.quality_of_work },
                    { label: 'Productivity', value: viewingReview.productivity },
                    { label: 'Communication', value: viewingReview.communication },
                    { label: 'Teamwork', value: viewingReview.teamwork },
                    { label: 'Problem-Solving', value: viewingReview.problem_solving },
                    { label: 'Initiative', value: viewingReview.initiative },
                    { label: 'Attendance/Punctuality', value: viewingReview.attendance_punctuality }
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium">{label}</span>
                      <div className="flex items-center space-x-2">
                        {renderStars(value || 0)}
                        <span className="text-sm font-bold">{value || 'N/A'}/5</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goals */}
              {(viewingReview.previous_goals_completion || viewingReview.goals) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Goals</h3>
                  {viewingReview.previous_goals_completion && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Previous Goals Completion</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{viewingReview.previous_goals_completion}</p>
                    </div>
                  )}
                  {viewingReview.goals && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Goals for Next Period</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{viewingReview.goals}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Performance Feedback</h3>
                {viewingReview.achievements && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Key Achievements</p>
                    <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">{viewingReview.achievements}</p>
                  </div>
                )}
                {viewingReview.areas_of_improvement && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Areas of Improvement</p>
                    <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">{viewingReview.areas_of_improvement}</p>
                  </div>
                )}
                {viewingReview.manager_comments && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Manager Comments</p>
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">{viewingReview.manager_comments}</p>
                  </div>
                )}
                {viewingReview.employee_self_assessment && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Employee Self-Assessment</p>
                    <p className="text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">{viewingReview.employee_self_assessment}</p>
                  </div>
                )}
              </div>

              {/* Final Evaluation */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Final Evaluation</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Overall Rating</p>
                    <div className="flex items-center space-x-2">
                      {renderStars(viewingReview.overall_rating || 0)}
                      <span className="text-lg font-bold">{viewingReview.overall_rating || 'N/A'}/5</span>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Recommendation</p>
                    <p className="text-lg font-semibold flex items-center gap-2">
                      {viewingReview.recommendation === 'none' ? <><Circle className="w-4 h-4" /> No Action</> :
                       viewingReview.recommendation === 'promotion' ? <><Rocket className="w-4 h-4" /> Promotion</> :
                       viewingReview.recommendation === 'bonus' ? <><DollarSign className="w-4 h-4" /> Bonus</> :
                       viewingReview.recommendation === 'training' ? <><BookOpen className="w-4 h-4" /> Training</> :
                       viewingReview.recommendation === 'pip' ? <><AlertTriangle className="w-4 h-4" /> Needs Improvement (PIP)</> :
                       <><Circle className="w-4 h-4" /> No Action</>}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className="text-lg font-semibold capitalize">{viewingReview.status || 'Draft'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                {(isAdmin || isManager || isHR) && (
                  <Button 
                    onClick={() => {
                      setViewingReview(null);
                      handleEditReview(viewingReview);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Review
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => setViewingReview(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Performance;