"""
Performance Service - AI-powered performance analysis
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class PerformanceService:
    def __init__(self, llm_service):
        self.llm = llm_service
    
    def summarize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Summarize employee performance data
        
        Args:
            data: {
                employee_data: Dict (name, role, department),
                performance_metrics: Dict (ratings, goals),
                attendance: Dict (present_days, total_days),
                feedback: List[str]
            }
            
        Returns:
            Performance summary and recommendations
        """
        employee = data.get('employee_data', {})
        metrics = data.get('performance_metrics', {})
        attendance = data.get('attendance', {})
        feedback = data.get('feedback', [])
        
        employee_name = employee.get('name', 'Employee')
        role = employee.get('role', 'Team Member')
        department = employee.get('department', 'Department')
        
        # Format metrics
        metrics_str = self._format_metrics(metrics)
        attendance_str = self._format_attendance(attendance)
        feedback_str = '\n'.join(f"- {f}" for f in feedback) if feedback else "No feedback provided"
        
        prompt = f"""<s>[INST] You are an expert HR manager. Analyze this employee's performance data and provide a comprehensive summary.

Employee: {employee_name}
Role: {role}
Department: {department}

Performance Metrics:
{metrics_str}

Attendance:
{attendance_str}

Manager/Peer Feedback:
{feedback_str}

Provide a detailed analysis with:
1. Overall Performance Rating (1-5 stars)
2. Key Strengths (3-5 points)
3. Areas for Improvement (2-4 points)
4. Achievements & Highlights
5. Development Recommendations
6. Overall Summary (2-3 sentences)

Be objective, constructive, and specific. [/INST]"""
        
        response = self.llm.generate(prompt, max_tokens=1000, temperature=0.6)
        
        # Parse response
        rating = self._extract_rating(response)
        
        return {
            'overall_rating': rating,
            'summary': response,
            'strengths': self._extract_section(response, 'Key Strengths'),
            'improvements': self._extract_section(response, 'Areas for Improvement'),
            'recommendations': self._extract_section(response, 'Development Recommendations')
        }
    
    def _format_metrics(self, metrics: Dict) -> str:
        """Format performance metrics for prompt"""
        if not metrics:
            return "No metrics provided"
        
        lines = []
        for key, value in metrics.items():
            formatted_key = key.replace('_', ' ').title()
            lines.append(f"- {formatted_key}: {value}")
        
        return '\n'.join(lines)
    
    def _format_attendance(self, attendance: Dict) -> str:
        """Format attendance data for prompt"""
        if not attendance:
            return "No attendance data"
        
        present = attendance.get('present_days', 0)
        total = attendance.get('total_days', 0)
        percentage = (present / total * 100) if total > 0 else 0
        
        return f"Present: {present}/{total} days ({percentage:.1f}%)"
    
    def _extract_rating(self, text: str) -> float:
        """Extract overall rating from response"""
        import re
        
        patterns = [
            r'Overall Performance Rating.*?(\d+\.?\d*)',
            r'Rating.*?(\d+\.?\d*)',
            r'(\d+\.?\d*)\s*(?:stars?|/5)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                rating = float(match.group(1))
                return min(max(rating, 1.0), 5.0)  # Clamp between 1-5
        
        return 3.0  # Default rating
    
    def _extract_section(self, text: str, section_name: str) -> str:
        """Extract a specific section from response"""
        import re
        
        pattern = f"{section_name}:(.+?)(?=\\n\\d+\\.|$)"
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        
        if match:
            return match.group(1).strip()
        
        return ""
