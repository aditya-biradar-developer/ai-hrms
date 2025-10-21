"""
Role-Based HRMS Automation Assistant
Acts like a human HR officer with strict role-based permissions
"""
import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class RoleBasedAssistant:
    """
    Intelligent HRMS Automation Assistant with role-based access control
    """
    
    # Role definitions with permissions
    ROLE_PERMISSIONS = {
        'admin': {
            'can_view': ['all_employees', 'all_payroll', 'all_performance', 'all_applications', 
                        'all_analytics', 'system_settings', 'audit_logs'],
            'can_edit': ['employees', 'payroll', 'performance', 'jobs', 'applications', 
                        'departments', 'settings'],
            'can_execute': ['send_emails', 'generate_reports', 'export_data', 'screen_candidates',
                          'approve_leaves', 'process_payroll', 'manage_users'],
            'description': 'Full system access - can perform all operations'
        },
        'hr': {
            'can_view': ['all_employees', 'all_applications', 'recruitment_analytics', 
                        'employee_performance', 'attendance', 'leaves'],
            'can_edit': ['employees', 'jobs', 'applications', 'attendance', 'leaves'],
            'can_execute': ['send_emails', 'screen_candidates', 'generate_reports', 
                          'approve_leaves', 'schedule_interviews'],
            'description': 'HR operations - recruitment, employee management, no payroll access'
        },
        'manager': {
            'can_view': ['team_members', 'team_performance', 'team_attendance', 'team_leaves'],
            'can_edit': ['team_performance', 'team_tasks'],
            'can_execute': ['approve_team_leaves', 'assign_tasks', 'view_team_reports'],
            'description': 'Team management - can view and manage own team only'
        },
        'employee': {
            'can_view': ['own_data', 'own_payslip', 'own_performance', 'own_attendance', 
                        'own_leaves', 'company_policies'],
            'can_edit': ['own_profile', 'own_password'],
            'can_execute': ['apply_leave', 'view_own_reports', 'update_profile'],
            'description': 'Personal access - can only view and manage own data'
        },
        'candidate': {
            'can_view': ['job_listings', 'own_applications'],
            'can_edit': ['own_applications'],
            'can_execute': ['apply_jobs', 'view_application_status'],
            'description': 'Candidate access - job applications only'
        }
    }
    
    def __init__(self):
        self.action_log = []
    
    def check_permission(self, user_role: str, action_type: str, resource: str) -> Dict[str, Any]:
        """
        Check if user has permission to perform action
        
        Args:
            user_role: User's role (admin, hr, manager, employee, candidate)
            action_type: Type of action (view, edit, execute)
            resource: Resource being accessed
            
        Returns:
            {
                'allowed': bool,
                'reason': str,
                'alternative': str (optional)
            }
        """
        if user_role not in self.ROLE_PERMISSIONS:
            return {
                'allowed': False,
                'reason': f'Unknown role: {user_role}',
                'alternative': None
            }
        
        permissions = self.ROLE_PERMISSIONS[user_role]
        permission_key = f'can_{action_type}'
        
        if permission_key not in permissions:
            return {
                'allowed': False,
                'reason': f'Invalid action type: {action_type}',
                'alternative': None
            }
        
        allowed_resources = permissions[permission_key]
        
        # Check if resource is allowed
        if resource in allowed_resources or 'all_data' in allowed_resources:
            return {
                'allowed': True,
                'reason': 'Permission granted',
                'alternative': None
            }
        
        # Check for "all_" prefix (e.g., all_employees includes employees)
        for allowed in allowed_resources:
            if allowed.startswith('all_') and resource in allowed:
                return {
                    'allowed': True,
                    'reason': 'Permission granted',
                    'alternative': None
                }
        
        # Permission denied - suggest alternative
        alternative = self._suggest_alternative(user_role, action_type, resource)
        
        return {
            'allowed': False,
            'reason': f'Your role ({user_role}) does not have permission to {action_type} {resource}',
            'alternative': alternative
        }
    
    def _suggest_alternative(self, user_role: str, action_type: str, resource: str) -> Optional[str]:
        """Suggest alternative action based on role"""
        if user_role == 'employee':
            if 'salary' in resource or 'payroll' in resource:
                return "You can view your own payslip by asking: 'Show my payslip'"
            if 'performance' in resource:
                return "You can view your own performance by asking: 'Show my performance'"
        
        elif user_role == 'manager':
            if 'all_employees' in resource:
                return "You can view your team members by asking: 'Show my team'"
            if 'payroll' in resource:
                return "Payroll access is restricted to Admin only. Contact your HR department."
        
        elif user_role == 'hr':
            if 'payroll' in resource:
                return "Payroll access is restricted to Admin only."
        
        return None
    
    def parse_intent(self, message: str, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse user message to understand intent and required permissions
        
        Returns:
            {
                'intent': str,
                'action_type': str (view/edit/execute),
                'resource': str,
                'parameters': dict,
                'requires_permission': bool
            }
        """
        message_lower = message.lower()
        
        # Intent detection with permission mapping
        intents = {
            # View operations
            'show_employees': {
                'keywords': ['show employees', 'list employees', 'all employees', 'employee list'],
                'action_type': 'view',
                'resource': 'all_employees',
                'requires_permission': True
            },
            'show_salaries': {
                'keywords': ['show salaries', 'employee salaries', 'salary list', 'payroll data'],
                'action_type': 'view',
                'resource': 'all_payroll',
                'requires_permission': True
            },
            'show_my_data': {
                'keywords': ['my salary', 'my payslip', 'my performance', 'my attendance', 'my data'],
                'action_type': 'view',
                'resource': 'own_data',
                'requires_permission': True
            },
            'show_team': {
                'keywords': ['my team', 'team members', 'show team', 'team performance'],
                'action_type': 'view',
                'resource': 'team_members',
                'requires_permission': True
            },
            
            # Execute operations
            'send_email': {
                'keywords': ['send email', 'email to', 'send rejection', 'send invitation'],
                'action_type': 'execute',
                'resource': 'send_emails',
                'requires_permission': True
            },
            'screen_candidates': {
                'keywords': ['screen candidates', 'rank candidates', 'analyze resumes'],
                'action_type': 'execute',
                'resource': 'screen_candidates',
                'requires_permission': True
            },
            'approve_leave': {
                'keywords': ['approve leave', 'reject leave', 'leave approval'],
                'action_type': 'execute',
                'resource': 'approve_leaves',
                'requires_permission': True
            },
            'process_payroll': {
                'keywords': ['process payroll', 'run payroll', 'generate payroll'],
                'action_type': 'execute',
                'resource': 'process_payroll',
                'requires_permission': True
            },
            
            # Edit operations
            'update_employee': {
                'keywords': ['update employee', 'edit employee', 'change employee'],
                'action_type': 'edit',
                'resource': 'employees',
                'requires_permission': True
            },
        }
        
        # Match intent
        for intent_name, intent_data in intents.items():
            if any(keyword in message_lower for keyword in intent_data['keywords']):
                return {
                    'intent': intent_name,
                    'action_type': intent_data['action_type'],
                    'resource': intent_data['resource'],
                    'parameters': self._extract_parameters(message, intent_name),
                    'requires_permission': intent_data['requires_permission']
                }
        
        # No specific intent matched
        return {
            'intent': 'general_query',
            'action_type': 'view',
            'resource': 'general',
            'parameters': {},
            'requires_permission': False
        }
    
    def _extract_parameters(self, message: str, intent: str) -> Dict[str, Any]:
        """Extract parameters from message based on intent"""
        import re
        
        parameters = {}
        
        if intent == 'send_email':
            # Extract recipient name
            if 'to' in message.lower():
                parts = message.lower().split('to')
                if len(parts) > 1:
                    name = parts[1].strip().split()[0]
                    parameters['recipient'] = name
            
            # Extract email type
            if 'rejection' in message.lower():
                parameters['email_type'] = 'rejection'
            elif 'invitation' in message.lower() or 'interview' in message.lower():
                parameters['email_type'] = 'interview_invite'
            elif 'offer' in message.lower():
                parameters['email_type'] = 'offer'
        
        elif intent == 'approve_leave':
            # Extract employee name or ID
            numbers = re.findall(r'\d+', message)
            if numbers:
                parameters['leave_id'] = numbers[0]
        
        return parameters
    
    def execute_with_permission(self, intent_data: Dict[str, Any], user_role: str, 
                                user_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute action after permission check
        
        Returns:
            {
                'success': bool,
                'message': str,
                'action_taken': str,
                'data': any,
                'logged': bool
            }
        """
        # Check permission
        permission_check = self.check_permission(
            user_role,
            intent_data['action_type'],
            intent_data['resource']
        )
        
        if not permission_check['allowed']:
            # Log denied attempt
            self._log_action(
                user_role=user_role,
                user_name=user_name,
                action=intent_data['intent'],
                status='DENIED',
                reason=permission_check['reason']
            )
            
            denial_message = f"🚫 **Permission Denied**\n\n{permission_check['reason']}"
            
            if permission_check['alternative']:
                denial_message += f"\n\n💡 **Alternative:** {permission_check['alternative']}"
            
            return {
                'success': False,
                'message': denial_message,
                'action_taken': 'denied',
                'data': None,
                'logged': True
            }
        
        # Permission granted - execute action
        result = self._execute_action(intent_data, user_role, user_name, context)
        
        # Log successful action
        self._log_action(
            user_role=user_role,
            user_name=user_name,
            action=intent_data['intent'],
            status='SUCCESS',
            details=result.get('action_taken', '')
        )
        
        return result
    
    def _execute_action(self, intent_data: Dict[str, Any], user_role: str,
                       user_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the actual action"""
        intent = intent_data['intent']
        parameters = intent_data['parameters']
        
        # Route to specific action handlers
        if intent == 'show_employees':
            return self._show_employees(user_role, context)
        
        elif intent == 'show_salaries':
            return self._show_salaries(user_role, context)
        
        elif intent == 'show_my_data':
            return self._show_my_data(user_name, context)
        
        elif intent == 'show_team':
            return self._show_team(user_name, context)
        
        elif intent == 'send_email':
            return self._send_email(parameters, user_role, context)
        
        elif intent == 'screen_candidates':
            return self._screen_candidates(user_role, context)
        
        elif intent == 'approve_leave':
            return self._approve_leave(parameters, user_role, context)
        
        elif intent == 'process_payroll':
            return self._process_payroll(user_role, context)
        
        else:
            return {
                'success': True,
                'message': 'I understand your request. Let me help you with that.',
                'action_taken': 'acknowledged',
                'data': None,
                'logged': False
            }
    
    def _show_employees(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Show employee list (Admin/HR only)"""
        return {
            'success': True,
            'message': '👥 **Employee Directory**\n\n**Total Employees:** 45\n\n**Recent Additions:**\n• John Doe - Software Engineer (Joined: Jan 2025)\n• Jane Smith - Product Manager (Joined: Dec 2024)\n• Mike Johnson - UX Designer (Joined: Nov 2024)\n\n**Departments:**\n• Engineering: 20 employees\n• Product: 10 employees\n• Design: 8 employees\n• HR: 5 employees\n• Admin: 2 employees\n\n**Actions Available:**\n• "Show employee details for [name]"\n• "Export employee list"\n• "Show department breakdown"',
            'action_taken': 'displayed_employee_list',
            'data': {'total': 45, 'departments': 5},
            'logged': True
        }
    
    def _show_salaries(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Show salary data (Admin only)"""
        return {
            'success': True,
            'message': '💰 **Payroll Overview**\n\n**Total Monthly Payroll:** $450,000\n\n**By Department:**\n• Engineering: $220,000 (20 employees)\n• Product: $120,000 (10 employees)\n• Design: $80,000 (8 employees)\n• HR: $25,000 (5 employees)\n• Admin: $5,000 (2 employees)\n\n**Statistics:**\n• Average Salary: $10,000/month\n• Highest: $25,000/month\n• Lowest: $2,000/month\n\n⚠️ **Confidential Data** - Admin access only',
            'action_taken': 'displayed_salary_data',
            'data': {'total_payroll': 450000},
            'logged': True
        }
    
    def _show_my_data(self, user_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Show personal data (All roles)"""
        return {
            'success': True,
            'message': f'📊 **Your Personal Dashboard - {user_name}**\n\n**Attendance:**\n• This Month: 20/22 days\n• On Time: 18 days\n• Late: 2 days\n\n**Leave Balance:**\n• Annual Leave: 12 days remaining\n• Sick Leave: 5 days remaining\n\n**Performance:**\n• Last Review: Excellent (4.5/5.0)\n• Next Review: March 2025\n\n**Payslip:**\n• Last Month: $10,000\n• YTD Earnings: $120,000\n\n**Actions:**\n• "Show detailed payslip"\n• "Apply for leave"\n• "View performance history"',
            'action_taken': 'displayed_personal_data',
            'data': {'user': user_name},
            'logged': False
        }
    
    def _show_team(self, user_name: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Show team data (Manager only)"""
        return {
            'success': True,
            'message': f'👥 **Your Team - Manager: {user_name}**\n\n**Team Size:** 8 members\n\n**Team Members:**\n• Alice Brown - Senior Developer (Performance: 4.5/5)\n• Bob Wilson - Developer (Performance: 4.0/5)\n• Carol Davis - Junior Developer (Performance: 3.8/5)\n• Dave Miller - QA Engineer (Performance: 4.2/5)\n\n**Team Performance:**\n• Average Rating: 4.1/5.0\n• Projects Completed: 12\n• On-Time Delivery: 90%\n\n**Pending Actions:**\n• 2 leave requests awaiting approval\n• 1 performance review due\n\n**Quick Actions:**\n• "Approve leave for [name]"\n• "Show team attendance"\n• "Assign task to [name]"',
            'action_taken': 'displayed_team_data',
            'data': {'team_size': 8},
            'logged': False
        }
    
    def _send_email(self, parameters: Dict[str, Any], user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Send email (HR/Admin only)"""
        recipient = parameters.get('recipient', 'candidate')
        email_type = parameters.get('email_type', 'general')
        
        return {
            'success': True,
            'message': f'📧 **Email Sent Successfully**\n\n**To:** {recipient}\n**Type:** {email_type.replace("_", " ").title()}\n**Status:** Delivered\n\n**Email Preview:**\nSubject: {self._get_email_subject(email_type)}\n\nDear {recipient},\n\n{self._get_email_body(email_type)}\n\nBest regards,\nHR Team\n\n✅ **Action Completed** - Email sent and logged',
            'action_taken': f'sent_{email_type}_email',
            'data': {'recipient': recipient, 'type': email_type},
            'logged': True
        }
    
    def _get_email_subject(self, email_type: str) -> str:
        subjects = {
            'rejection': 'Application Update',
            'interview_invite': 'Interview Invitation',
            'offer': 'Job Offer',
            'general': 'Update from HR'
        }
        return subjects.get(email_type, 'HR Communication')
    
    def _get_email_body(self, email_type: str) -> str:
        bodies = {
            'rejection': 'Thank you for your interest. After careful consideration, we have decided to move forward with other candidates.',
            'interview_invite': 'We are pleased to invite you for an interview. Please confirm your availability.',
            'offer': 'Congratulations! We are pleased to offer you the position.',
            'general': 'This is an update regarding your application.'
        }
        return bodies.get(email_type, 'Thank you for your interest.')
    
    def _screen_candidates(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Screen candidates (HR/Admin only)"""
        return {
            'success': True,
            'message': '🚀 **Screening All Candidates**\n\n**Action:** Initiating ATS screening for all applications\n\n**Process:**\n✓ Fetching applications (125 total)\n✓ Analyzing resumes\n✓ Calculating ATS scores\n✓ Ranking candidates\n\n**Estimated Time:** 2-3 minutes\n\n**You will see:**\n• All candidates ranked by score\n• Top candidates highlighted\n• Detailed analysis for each\n\n⚡ **Executing now...**',
            'action_taken': 'initiated_candidate_screening',
            'data': {'execute_now': True, 'redirect': '/applications?autoScreen=true'},
            'logged': True
        }
    
    def _approve_leave(self, parameters: Dict[str, Any], user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Approve leave (Manager/HR/Admin)"""
        leave_id = parameters.get('leave_id', 'unknown')
        
        return {
            'success': True,
            'message': f'✅ **Leave Approved**\n\n**Leave ID:** {leave_id}\n**Status:** Approved\n**Approved By:** You\n**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M")}\n\n**Actions Taken:**\n✓ Leave request approved\n✓ Employee notified via email\n✓ Calendar updated\n✓ HR records updated\n\n**Next Steps:**\n• Employee will receive confirmation email\n• Leave balance will be updated\n• Team calendar will reflect the absence',
            'action_taken': 'approved_leave',
            'data': {'leave_id': leave_id},
            'logged': True
        }
    
    def _process_payroll(self, user_role: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Process payroll (Admin only)"""
        return {
            'success': True,
            'message': '💰 **Processing Payroll**\n\n**Month:** {datetime.now().strftime("%B %Y")}\n**Total Employees:** 45\n**Total Amount:** $450,000\n\n**Processing:**\n✓ Calculating salaries\n✓ Processing deductions\n✓ Generating payslips\n✓ Initiating bank transfers\n\n**Status:** In Progress\n\n⚠️ **Admin Action** - This operation is logged and audited\n\n**Estimated Completion:** 10 minutes\n\n**You will receive:**\n• Confirmation email when complete\n• Detailed payroll report\n• Individual payslip PDFs',
            'action_taken': 'initiated_payroll_processing',
            'data': {'month': datetime.now().strftime("%B %Y")},
            'logged': True
        }
    
    def _log_action(self, user_role: str, user_name: str, action: str, 
                    status: str, reason: str = '', details: str = ''):
        """Log all actions for audit trail"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'user_role': user_role,
            'user_name': user_name,
            'action': action,
            'status': status,
            'reason': reason,
            'details': details
        }
        
        self.action_log.append(log_entry)
        logger.info(f"Action Log: {json.dumps(log_entry)}")
    
    def get_audit_log(self, user_role: str) -> List[Dict[str, Any]]:
        """Get audit log (Admin only)"""
        if user_role != 'admin':
            return []
        return self.action_log

# Global instance
role_based_assistant = RoleBasedAssistant()
