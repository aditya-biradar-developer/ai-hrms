"""
Smart Keyword-Based Evaluator
Fast, offline evaluation for common questions
"""

import re
from typing import Dict, Any

class SmartKeywordEvaluator:
    """Smart evaluation using keyword matching and patterns"""
    
    def __init__(self):
        self.expansion_db = {
            'html': 'hypertext markup language',
            'css': 'cascading style sheets',
            'js': 'javascript',
            'sql': 'structured query language',
            'api': 'application programming interface',
            'url': 'uniform resource locator',
            'http': 'hypertext transfer protocol',
            'https': 'hypertext transfer protocol secure',
            'json': 'javascript object notation',
            'xml': 'extensible markup language',
            'dom': 'document object model'
        }
        
        self.concept_keywords = {
            'html': ['structure', 'markup', 'tags', 'elements', 'semantic', 'skeleton'],
            'css': ['style', 'styling', 'design', 'layout', 'appearance', 'visual'],
            'javascript': ['behavior', 'interactive', 'dynamic', 'logic', 'functionality'],
            'react': ['component', 'virtual dom', 'state', 'props', 'hooks'],
            'nodejs': ['server', 'backend', 'runtime', 'javascript', 'non-blocking']
        }
    
    def evaluate(self, question: str, answer: str) -> Dict[str, Any]:
        """Evaluate answer using smart keyword matching"""
        question_lower = question.lower()
        answer_lower = answer.lower().strip()
        
        # Check for expansion questions
        if 'expand' in question_lower or 'stands for' in question_lower or 'full form' in question_lower:
            return self._evaluate_expansion(question, answer)
        
        # Check for "what is" or "used for" questions
        if 'what is' in question_lower or 'used for' in question_lower or 'purpose' in question_lower:
            return self._evaluate_concept(question, answer)
        
        # Default evaluation
        return self._evaluate_generic(question, answer)
    
    def _evaluate_expansion(self, question: str, answer: str) -> Dict[str, Any]:
        """Evaluate expansion/acronym questions"""
        question_lower = question.lower()
        answer_lower = answer.lower().strip()
        
        # Find which acronym is being asked
        for acronym, correct_expansion in self.expansion_db.items():
            if acronym in question_lower:
                # Check if answer contains correct expansion
                if correct_expansion in answer_lower:
                    return {
                        "question": question,
                        "answer": answer[:200],
                        "score": 95,
                        "max_score": 100,
                        "technical_accuracy": 95,
                        "completeness": 90,
                        "communication": 85,
                        "feedback": f"✓ Correct! {acronym.upper()} = {correct_expansion.title()}"
                    }
                else:
                    # Check partial match
                    words = correct_expansion.split()
                    matched = sum(1 for word in words if word in answer_lower)
                    percentage = (matched / len(words)) * 100
                    
                    if percentage >= 75:
                        score = 70
                        feedback = f"⚠ Close! {acronym.upper()} = {correct_expansion.title()}"
                    elif percentage >= 50:
                        score = 50
                        feedback = f"✗ Partially correct. {acronym.upper()} = {correct_expansion.title()}"
                    else:
                        score = 25
                        feedback = f"✗ Incorrect. {acronym.upper()} = {correct_expansion.title()}"
                    
                    return {
                        "question": question,
                        "answer": answer[:200],
                        "score": score,
                        "max_score": 100,
                        "technical_accuracy": score,
                        "completeness": score - 10,
                        "communication": 70,
                        "feedback": feedback
                    }
        
        return self._evaluate_generic(question, answer)
    
    def _evaluate_concept(self, question: str, answer: str) -> Dict[str, Any]:
        """Evaluate concept understanding questions"""
        question_lower = question.lower()
        answer_lower = answer.lower().strip()
        
        # Find relevant keywords
        for tech, keywords in self.concept_keywords.items():
            if tech in question_lower:
                # Count matching keywords
                matched = sum(1 for keyword in keywords if keyword in answer_lower)
                percentage = (matched / len(keywords)) * 100
                
                if percentage >= 50:
                    score = 85 + (percentage - 50)
                    feedback = f"✓ Good understanding of {tech.upper()}. Mentions key concepts."
                elif percentage >= 33:
                    score = 70 + (percentage - 33) * 0.5
                    feedback = f"⚠ Decent answer. Could mention more about {tech.upper()}."
                elif percentage >= 16:
                    score = 55 + (percentage - 16) * 0.5
                    feedback = f"⚠ Basic understanding. Add more details about {tech.upper()}."
                else:
                    score = 40
                    feedback = f"✗ Incomplete. Focus on core concepts of {tech.upper()}."
                
                return {
                    "question": question,
                    "answer": answer[:200],
                    "score": int(score),
                    "max_score": 100,
                    "technical_accuracy": int(score),
                    "completeness": int(score - 10),
                    "communication": 75,
                    "feedback": feedback
                }
        
        return self._evaluate_generic(question, answer)
    
    def _evaluate_generic(self, question: str, answer: str) -> Dict[str, Any]:
        """Generic evaluation based on answer quality"""
        length = len(answer)
        
        # Score based on length and quality indicators
        if length >= 150:
            score = 80
            feedback = "✓ Comprehensive answer with good detail."
        elif length >= 80:
            score = 70
            feedback = "⚠ Good answer. Could add more examples."
        elif length >= 40:
            score = 60
            feedback = "⚠ Adequate answer. Needs more detail."
        elif length >= 15:
            score = 45
            feedback = "✗ Too brief. Expand your explanation."
        else:
            score = 25
            feedback = "✗ Insufficient answer. Provide more detail."
        
        return {
            "question": question,
            "answer": answer[:200],
            "score": score,
            "max_score": 100,
            "technical_accuracy": score,
            "completeness": score - 15,
            "communication": 70,
            "feedback": feedback
        }
