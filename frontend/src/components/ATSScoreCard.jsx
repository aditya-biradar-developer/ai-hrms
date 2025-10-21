import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { TrendingUp, Award, BookOpen, Briefcase, Hash, Brain, CheckCircle, XCircle } from 'lucide-react';

const ATSScoreCard = ({ screeningData, candidateName }) => {
  if (!screeningData) return null;

  // Calculate individual component scores with weights
  const skillScore = screeningData.skill_analysis?.skill_match_percentage || 0;
  const keywordScore = screeningData.keyword_match?.score || 0;
  const experienceScore = screeningData.experience_analysis?.score || 0;
  const educationScore = screeningData.education_verification?.score || 0;
  const aiScore = screeningData.ai_insights?.score || 0;

  // Calculate weighted points
  const skillPoints = (skillScore * 0.35).toFixed(1);
  const keywordPoints = (keywordScore * 0.20).toFixed(1);
  const experiencePoints = (experienceScore * 0.25).toFixed(1);
  const educationPoints = (educationScore * 0.10).toFixed(1);
  const aiPoints = (aiScore * 0.10).toFixed(1);

  // Pie chart data
  const pieData = [
    { name: 'Skills (35%)', value: parseFloat(skillPoints), percentage: skillScore, color: '#3b82f6' },
    { name: 'Keywords (20%)', value: parseFloat(keywordPoints), percentage: keywordScore, color: '#8b5cf6' },
    { name: 'Experience (25%)', value: parseFloat(experiencePoints), percentage: experienceScore, color: '#10b981' },
    { name: 'Education (10%)', value: parseFloat(educationPoints), percentage: educationScore, color: '#f59e0b' },
    { name: 'AI Analysis (10%)', value: parseFloat(aiPoints), percentage: aiScore, color: '#ec4899' }
  ];

  // Get recommendation color
  const getRecommendationColor = (recommendation) => {
    if (recommendation === 'Highly Recommended') return 'text-green-600 bg-green-50 border-green-200';
    if (recommendation === 'Recommended') return 'text-blue-600 bg-blue-50 border-blue-200';
    if (recommendation === 'Consider') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (recommendation === 'Weak Candidate') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">Score: {data.percentage.toFixed(1)}%</p>
          <p className="text-sm font-bold text-blue-600">Points: {data.value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">{candidateName || 'Candidate'}</h3>
          <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-lg border font-medium text-sm ${getRecommendationColor(screeningData.recommendation)}`}>
            {screeningData.recommendation}
          </div>
        </div>
        <div className="text-center">
          <div className="text-6xl font-bold text-purple-600">
            {screeningData.match_score || screeningData.ats_score || 0}
          </div>
          <div className="text-sm text-gray-600 font-medium">ATS Score</div>
        </div>
      </div>

      {/* Score Breakdown Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Score Breakdown</CardTitle>
          <CardDescription>Weighted component analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="flex items-center justify-center">
              {pieData.every(item => item.value === 0) ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-300">0</span>
                  </div>
                  <p className="mt-4 text-sm">No scores available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ value }) => value > 0 ? `${value} pts` : ''}
                      outerRadius={90}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => (
                        <span className="text-sm">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Score Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Skills (35%)</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{skillPoints} pts</div>
                  <div className="text-sm text-gray-600">{skillScore.toFixed(1)}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Keywords (20%)</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-600">{keywordPoints} pts</div>
                  <div className="text-sm text-gray-600">{keywordScore.toFixed(1)}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Experience (25%)</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">{experiencePoints} pts</div>
                  <div className="text-sm text-gray-600">{experienceScore.toFixed(1)}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Education (10%)</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-orange-600">{educationPoints} pts</div>
                  <div className="text-sm text-gray-600">{educationScore.toFixed(1)}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-pink-600" />
                  <span className="font-medium">AI Analysis (10%)</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-pink-600">{aiPoints} pts</div>
                  <div className="text-sm text-gray-600">{aiScore.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills Analysis */}
      {screeningData.skill_analysis && (
        <Card>
          <CardHeader>
            <CardTitle>Skills Analysis</CardTitle>
            <CardDescription>
              {screeningData.skill_analysis.total_skills_found} skills found | 
              {' '}{(screeningData.skill_analysis.skill_match_percentage || 0).toFixed(1)}% match
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Matched Skills */}
              {screeningData.skill_analysis.matched_skills?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-700">
                      Matched Skills ({screeningData.skill_analysis.matched_skills.length})
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {screeningData.skill_analysis.matched_skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {screeningData.skill_analysis.missing_skills?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-700">
                      Missing Skills ({screeningData.skill_analysis.missing_skills.length})
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {screeningData.skill_analysis.missing_skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Experience & Education */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Experience */}
        {screeningData.experience_analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Years Found:</span>
                <span className="font-semibold">{screeningData.experience_analysis.years_found} years</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Required:</span>
                <span className="font-semibold">{screeningData.experience_analysis.years_required} years</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {screeningData.education_verification && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Score:</span>
                <span className="font-semibold">{screeningData.education_verification.score}%</span>
              </div>
              <div>
                <span className="text-gray-600">Qualifications:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {screeningData.education_verification.qualifications_found?.map((qual, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                    >
                      {qual}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Strengths & Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg text-green-700">💪 Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(typeof screeningData.strengths === 'string' 
                ? screeningData.strengths.split('\n•').filter(s => s.trim())
                : screeningData.strengths || []
              ).map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{strength.replace('•', '').trim()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Gaps */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg text-orange-700">⚠️ Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(typeof screeningData.gaps === 'string'
                ? screeningData.gaps.split('\n•').filter(g => g.trim())
                : screeningData.gaps || []
              ).map((gap, index) => (
                <li key={index} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{gap.replace('•', '').trim()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ATSScoreCard;
