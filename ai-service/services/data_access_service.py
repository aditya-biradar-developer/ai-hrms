"""
Data Access Service for Role-Based Chatbot
Provides controlled access to system data based on user role
"""
import os
import requests
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class DataAccessService:
    """
    Provides role-based access to HRMS data for chatbot
    """
    
    def __init__(self):
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000/api')
    
    def get_accessible_data(self, user_role: str, data_type: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Get data based on user role and request type
        
        Args:
            user_role: User's role (admin, hr, manager, employee, candidate)
            data_type: Type of data requested (jobs, applications, candidates, etc.)
            context: Additional context (user_id, filters, etc.)
            
        Returns:
            Filtered data based on role permissions
        """
        if context is None:
            context = {}
        
        # Role-based data access rules
        access_rules = {
            'admin': ['jobs', 'applications', 'candidates', 'employees', 'analytics', 'all_data'],
            'hr': ['jobs', 'applications', 'candidates', 'recruitment_analytics'],
            'manager': ['team_data', 'team_performance', 'team_attendance'],
            'employee': ['own_data', 'leave_balance', 'payroll_summary'],
            'candidate': ['job_listings', 'own_applications']
        }
        
        allowed_data = access_rules.get(user_role, [])
        
        if data_type not in allowed_data and 'all_data' not in allowed_data:
            return {
                'error': 'Access denied',
                'message': f'Your role ({user_role}) does not have access to {data_type}'
            }
        
        # Fetch data based on type
        try:
            if data_type == 'jobs':
                return self._get_jobs_data(user_role, context)
            elif data_type == 'applications':
                return self._get_applications_data(user_role, context)
            elif data_type == 'candidates':
                return self._get_candidates_data(user_role, context)
            elif data_type == 'recruitment_analytics':
                return self._get_recruitment_analytics(user_role, context)
            elif data_type == 'own_data':
                return self._get_user_own_data(context)
            else:
                return {'message': f'Data type {data_type} not implemented yet'}
        except Exception as e:
            logger.error(f"Error fetching {data_type}: {str(e)}")
            return {'error': str(e)}
    
    def _get_jobs_data(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get jobs data based on role"""
        # Simulated data - replace with actual API calls
        if user_role in ['admin', 'hr']:
            return {
                'total_jobs': 15,
                'active_jobs': 10,
                'closed_jobs': 5,
                'recent_jobs': [
                    {'id': 1, 'title': 'Senior Software Engineer', 'applications': 45, 'status': 'active'},
                    {'id': 2, 'title': 'Product Manager', 'applications': 32, 'status': 'active'},
                    {'id': 3, 'title': 'UX Designer', 'applications': 28, 'status': 'active'}
                ]
            }
        elif user_role == 'candidate':
            return {
                'available_jobs': 10,
                'message': 'Browse available positions on the Jobs page'
            }
        else:
            return {'message': 'No job data available for your role'}
    
    def _get_applications_data(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get applications data based on role"""
        if user_role in ['admin', 'hr']:
            return {
                'total_applications': 125,
                'pending_review': 45,
                'shortlisted': 20,
                'interviewed': 15,
                'top_candidates': [
                    {'name': 'John Doe', 'score': 92, 'position': 'Senior Engineer'},
                    {'name': 'Jane Smith', 'score': 88, 'position': 'Product Manager'},
                    {'name': 'Mike Johnson', 'score': 85, 'position': 'UX Designer'}
                ],
                'message': 'Use "Rank All Candidates" to screen applications with ATS'
            }
        else:
            return {'error': 'Access denied'}
    
    def _get_candidates_data(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get candidates data based on role"""
        if user_role in ['admin', 'hr']:
            return {
                'total_candidates': 125,
                'screened': 80,
                'not_screened': 45,
                'average_ats_score': 67.5,
                'message': 'Screen candidates on the Applications page'
            }
        else:
            return {'error': 'Access denied'}
    
    def _get_recruitment_analytics(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get recruitment analytics based on role"""
        if user_role in ['admin', 'hr']:
            return {
                'time_to_hire': '18 days average',
                'application_rate': '25 applications/week',
                'interview_conversion': '15%',
                'offer_acceptance': '85%',
                'top_sources': ['LinkedIn', 'Company Website', 'Referrals'],
                'message': 'View detailed analytics on the Dashboard'
            }
        else:
            return {'error': 'Access denied'}
    
    def _get_user_own_data(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Get user's own data"""
        return {
            'message': 'Your personal data is available in Settings and Profile pages',
            'available_info': [
                'Leave balance',
                'Attendance records',
                'Payroll summary',
                'Performance reviews',
                'Personal documents'
            ]
        }
    
    def format_data_for_chat(self, data: Dict[str, Any], question: str) -> str:
        """
        Format data into natural language response
        
        Args:
            data: Data dictionary
            question: Original question
            
        Returns:
            Formatted natural language response
        """
        if 'error' in data:
            return f"❌ {data['error']}: {data.get('message', '')}"
        
        # Format based on data content
        response_parts = []
        
        # Handle different data types
        if 'total_jobs' in data:
            response_parts.append(f"📊 **Jobs Overview:**")
            response_parts.append(f"• Total Jobs: {data['total_jobs']}")
            response_parts.append(f"• Active: {data['active_jobs']}")
            response_parts.append(f"• Closed: {data['closed_jobs']}")
            
            if 'recent_jobs' in data:
                response_parts.append(f"\n**Recent Jobs:**")
                for job in data['recent_jobs'][:3]:
                    response_parts.append(f"• {job['title']} - {job['applications']} applications")
        
        elif 'total_applications' in data:
            response_parts.append(f"📊 **Applications Overview:**")
            response_parts.append(f"• Total: {data['total_applications']}")
            response_parts.append(f"• Pending Review: {data['pending_review']}")
            response_parts.append(f"• Shortlisted: {data['shortlisted']}")
            response_parts.append(f"• Interviewed: {data['interviewed']}")
            
            if 'top_candidates' in data:
                response_parts.append(f"\n**Top Candidates:**")
                for candidate in data['top_candidates'][:3]:
                    response_parts.append(f"• {candidate['name']} - {candidate['score']}% (ATS Score)")
        
        elif 'time_to_hire' in data:
            response_parts.append(f"📈 **Recruitment Analytics:**")
            response_parts.append(f"• Time to Hire: {data['time_to_hire']}")
            response_parts.append(f"• Application Rate: {data['application_rate']}")
            response_parts.append(f"• Interview Conversion: {data['interview_conversion']}")
            response_parts.append(f"• Offer Acceptance: {data['offer_acceptance']}")
        
        # Add message if present
        if 'message' in data:
            response_parts.append(f"\n💡 {data['message']}")
        
        return '\n'.join(response_parts) if response_parts else str(data)

# Global instance
data_access_service = DataAccessService()
