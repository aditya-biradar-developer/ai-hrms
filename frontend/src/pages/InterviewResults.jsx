import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, Search, Download, X } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function InterviewResults() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    fetchResults();
    if (user.role === 'admin' || user.role === 'hr') {
      fetchStats();
    }
  }, []);

  const fetchResults = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/interview-results`;
      
      // If candidate, fetch only their results
      if (user.role === 'candidate') {
        url = `${API_URL}/interview-results/candidate/${user.id}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResults(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching results:', error);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/interview-results/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getLevelBadge = (level) => {
    const colors = {
      'Excellent': 'bg-green-100 text-green-800',
      'Good': 'bg-blue-100 text-blue-800',
      'Average': 'bg-yellow-100 text-yellow-800',
      'Poor': 'bg-red-100 text-red-800',
      'Needs Improvement': 'bg-red-100 text-red-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const filteredResults = results.filter(result => {
    const matchesSearch = 
      result.candidate?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.job?.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterLevel === 'all' || 
      result.performance_level.toLowerCase() === filterLevel.toLowerCase();
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            AI Interview Results
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {user.role === 'candidate' 
              ? 'View your interview performance'
              : `${filteredResults.length} interview results`}
          </p>
        </div>


        {/* Search Bar */}
        {(user.role === 'admin' || user.role === 'hr') && (
          <div className="mb-4 flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidate or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Levels</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="satisfactory">Satisfactory</option>
              <option value="needs improvement">Needs Improvement</option>
            </select>
          </div>
        )}

        {/* Excel-like Table */}
        {filteredResults.length === 0 ? (
          <div className="bg-white border border-gray-300 rounded p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Interview Results</h3>
            <p className="text-sm text-gray-600">
              {user.role === 'candidate' 
                ? "You haven't completed any AI interviews yet."
                : "No interview results to display."}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-300 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      #
                    </th>
                    {(user.role === 'admin' || user.role === 'hr') && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          Candidate Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                          Email
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Position
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Date
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Overall Score
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Technical
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Completeness
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Communication
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                      Performance
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResults.map((result, index) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                        {index + 1}
                      </td>
                      {(user.role === 'admin' || user.role === 'hr') && (
                        <>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200">
                            {result.candidate?.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                            {result.candidate?.email}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200">
                        {result.job?.title}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200 whitespace-nowrap">
                        {new Date(result.completed_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center border-r border-gray-200">
                        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold ${getScoreColor(result.overall_score)}`}>
                          {result.overall_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold border-r border-gray-200">
                        {result.category_scores?.find(c => c.name === 'Technical Accuracy')?.score || '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold border-r border-gray-200">
                        {result.category_scores?.find(c => c.name === 'Completeness')?.score || '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-semibold border-r border-gray-200">
                        {result.category_scores?.find(c => c.name === 'Communication')?.score || '-'}
                      </td>
                      <td className="px-4 py-3 text-center border-r border-gray-200">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getLevelBadge(result.performance_level)}`}>
                          {result.performance_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedResult(result)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1 mx-auto"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed View Modal */}
        {selectedResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Interview Report</h2>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreColor(selectedResult.overall_score)} mb-4`}>
                    <span className="text-4xl font-bold">{selectedResult.overall_score}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{selectedResult.candidate?.name}</h3>
                  <p className="text-gray-600">{selectedResult.job?.title}</p>
                  <span className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-semibold ${getLevelBadge(selectedResult.performance_level)}`}>
                    {selectedResult.performance_level}
                  </span>
                </div>

                {/* Question by Question Analysis */}
                {selectedResult.question_scores && selectedResult.question_scores.length > 0 && (
                  <div className="mb-8">
                    <h4 className="font-semibold text-gray-900 mb-4 text-lg">Question-by-Question Analysis</h4>
                    <div className="space-y-6">
                      {selectedResult.question_scores.map((qs, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
                          {/* Question Header with Score */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="bg-indigo-100 text-indigo-700 font-semibold px-3 py-1 rounded-full text-sm">
                                  Q{idx + 1}
                                </span>
                                <span className={`font-bold text-lg ${getScoreColor(qs.score).split(' ')[0]}`}>
                                  {qs.score}/{qs.max_score}
                                </span>
                              </div>
                              <p className="font-medium text-gray-900 text-base">{qs.question}</p>
                            </div>
                          </div>

                          {/* Code Snippet (if present) */}
                          {qs.code && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold text-gray-700 mb-2">Code Snippet:</p>
                              <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-800 px-3 py-2">
                                  <span className="text-gray-300 text-xs font-semibold">Code</span>
                                </div>
                                <pre className="bg-gray-900 p-3 overflow-x-auto">
                                  <code className="text-gray-100 text-sm font-mono">
                                    {qs.code}
                                  </code>
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Candidate's Answer */}
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Candidate's Answer:</p>
                            <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                              <p className="text-gray-800 text-sm whitespace-pre-wrap">
                                {qs.answer || 'No response provided'}
                              </p>
                            </div>
                          </div>

                          {/* AI Feedback */}
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">AI Evaluation:</p>
                            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-400">
                              <p className="text-gray-700 text-sm">
                                {qs.feedback || 'No feedback available'}
                              </p>
                            </div>
                          </div>

                          {/* Score Bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${qs.score >= 80 ? 'bg-green-500' : qs.score >= 60 ? 'bg-blue-500' : qs.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${qs.score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category Scores Summary */}
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">Performance Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedResult.category_scores?.map((category, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{category.name}</span>
                          <span className="text-sm font-bold text-gray-900">{category.score}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${category.score >= 80 ? 'bg-green-500' : category.score >= 60 ? 'bg-blue-500' : category.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${category.score}%` }}
                          />
                        </div>
                        {category.comment && (
                          <p className="text-xs text-gray-600">{category.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall Feedback */}
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-900 mb-3 text-lg">Overall Feedback</h4>
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-400">
                    <p className="text-gray-700 whitespace-pre-line">{selectedResult.feedback}</p>
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {selectedResult.strengths && selectedResult.strengths.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Strengths</h4>
                      <ul className="space-y-2">
                        {selectedResult.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700">
                            <span className="text-green-600 mt-1">✓</span>
                            <span className="text-sm">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedResult.weaknesses && selectedResult.weaknesses.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Areas for Improvement</h4>
                      <ul className="space-y-2">
                        {selectedResult.weaknesses.map((weakness, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700">
                            <span className="text-yellow-600 mt-1">→</span>
                            <span className="text-sm">{weakness}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {selectedResult.recommendations && selectedResult.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Recommendations</h4>
                    <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400">
                      <ul className="space-y-2">
                        {selectedResult.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-gray-700">
                            <span className="text-yellow-600 mt-1">•</span>
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
