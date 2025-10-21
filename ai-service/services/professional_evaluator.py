"""
Professional Interview Evaluator
Uses approach similar to HireVue, HackerRank, CodeSignal
- Reference answers with key concepts
- Semantic similarity scoring
- Keyword/concept matching
- Multi-criteria rubric
"""

import logging
import json
from typing import List, Dict, Any
import re

logger = logging.getLogger(__name__)

class ProfessionalEvaluator:
    def __init__(self):
        """Initialize professional evaluator with reference answers and rubrics"""
        
        # Reference answers database (like HackerRank does)
        self.reference_answers = {
            "id class html": {
                "key_concepts": [
                    "id unique",
                    "class reusable",
                    "id single element",
                    "class multiple elements",
                    "# selector id",
                    ". selector class"
                ],
                "keywords": ["unique", "reusable", "multiple", "selector", "#", "."],
                "ideal_answer": "ID is unique and used for single elements, while class can be reused for multiple elements. ID uses # selector and class uses . selector in CSS.",
                "min_acceptable": "ID is unique, class is reusable"
            },
            "box model css": {
                "key_concepts": [
                    "content",
                    "padding",
                    "border",
                    "margin",
                    "four layers",
                    "inside out"
                ],
                "keywords": ["content", "padding", "border", "margin"],
                "ideal_answer": "The CSS box model consists of four layers from inside out: content, padding, border, and margin.",
                "min_acceptable": "content, padding, border, margin"
            },
            "javascript html include": {
                "key_concepts": [
                    "script tag",
                    "<script>",
                    "inline",
                    "external",
                    "src attribute"
                ],
                "keywords": ["script", "tag", "<script>", "src"],
                "ideal_answer": "JavaScript can be included using <script> tags, either inline or external with src attribute.",
                "min_acceptable": "script tag"
            },
            "var let const javascript": {
                "key_concepts": [
                    "var function scoped",
                    "let block scoped",
                    "const block scoped",
                    "var hoisted",
                    "const immutable",
                    "let reassignable"
                ],
                "keywords": ["scope", "hoisting", "const", "let", "var", "block", "function"],
                "ideal_answer": "var is function-scoped and hoisted, let is block-scoped and reassignable, const is block-scoped and immutable.",
                "min_acceptable": "var hoisted, let and const block scoped"
            },
            "flexbox css": {
                "key_concepts": [
                    "flexible layout",
                    "responsive",
                    "flex container",
                    "flex items",
                    "main axis",
                    "cross axis"
                ],
                "keywords": ["flexible", "layout", "responsive", "container", "flex"],
                "ideal_answer": "Flexbox is a CSS layout model for creating flexible, responsive layouts with flex containers and items.",
                "min_acceptable": "flexible responsive layout"
            },
            "useeffect react": {
                "key_concepts": [
                    "side effects",
                    "after render",
                    "data fetching",
                    "subscriptions",
                    "dom updates",
                    "cleanup"
                ],
                "keywords": ["effect", "side", "render", "fetch", "subscription", "lifecycle"],
                "ideal_answer": "useEffect handles side effects after render, like data fetching, subscriptions, and DOM updates. It can return cleanup function.",
                "min_acceptable": "side effects after render"
            }
        }
    
    def evaluate_interview(self, questions: List[Dict], answers: List[Dict], job_title: str, candidate_name: str) -> Dict[str, Any]:
        """
        Evaluate interview using professional multi-criteria approach
        Similar to HackerRank/CodeSignal evaluation system
        """
        
        question_scores = []
        total_score = 0
        technical_scores = []
        completeness_scores = []
        communication_scores = []
        
        for q, a in zip(questions, answers):
            question_text = q.get('text', '').lower()
            answer_text = a.get('answer', '').lower().strip()
            
            if not answer_text or len(answer_text) < 10:
                # No answer or too short
                score_data = {
                    "question": q.get('text', 'Question'),
                    "answer": a.get('answer', ''),
                    "score": 0,
                    "max_score": 100,
                    "technical_accuracy": 0,
                    "completeness": 0,
                    "communication": 0,
                    "feedback": "No sufficient answer provided. Please attempt the question.",
                    "code": q.get('code')  # Include code snippet
                }
                question_scores.append(score_data)
                continue
            
            # Score the answer using multi-criteria
            score_data = self._score_answer(question_text, answer_text, q.get('text', ''))
            # Add code snippet to score data
            score_data['code'] = q.get('code')
            question_scores.append(score_data)
            
            total_score += score_data['score']
            technical_scores.append(score_data['technical_accuracy'])
            completeness_scores.append(score_data['completeness'])
            communication_scores.append(score_data['communication'])
        
        # Calculate averages
        num_questions = len(questions)
        overall_score = int(total_score / num_questions) if num_questions > 0 else 0
        
        avg_technical = int(sum(technical_scores) / len(technical_scores)) if technical_scores else 0
        avg_completeness = int(sum(completeness_scores) / len(completeness_scores)) if completeness_scores else 0
        avg_communication = int(sum(communication_scores) / len(communication_scores)) if communication_scores else 0
        
        # Determine performance level
        if overall_score >= 85:
            performance_level = "Excellent"
        elif overall_score >= 70:
            performance_level = "Good"
        elif overall_score >= 55:
            performance_level = "Satisfactory"
        elif overall_score >= 40:
            performance_level = "Needs Improvement"
        else:
            performance_level = "Weak"
        
        # Generate feedback
        feedback = self._generate_overall_feedback(overall_score, avg_technical, avg_completeness, avg_communication)
        recommendations = self._generate_recommendations(technical_scores, completeness_scores, communication_scores)
        strengths, weaknesses = self._identify_strengths_weaknesses(question_scores)
        
        return {
            "overall_score": overall_score,
            "performance_level": performance_level,
            "question_scores": question_scores,
            "category_scores": [
                {"name": "Technical Accuracy", "score": avg_technical, "comment": "Correctness of technical concepts"},
                {"name": "Completeness", "score": avg_completeness, "comment": "Coverage of key points"},
                {"name": "Communication", "score": avg_communication, "comment": "Clarity of explanation"}
            ],
            "feedback": feedback,
            "recommendations": recommendations,
            "strengths": strengths,
            "weaknesses": weaknesses
        }
    
    def _score_answer(self, question_lower: str, answer_lower: str, original_question: str) -> Dict[str, Any]:
        """Score a single answer using multi-criteria rubric"""
        
        logger.info(f"🎯 Scoring answer for: {original_question[:60]}...")
        
        # Try GROQ AI evaluation first for ALL questions (more accurate!)
        try:
            logger.info("🚀 Attempting GROQ evaluation...")
            from services.groq_evaluator import GroqEvaluator
            evaluator = GroqEvaluator()
            result = evaluator.evaluate_answer(original_question, answer_lower)
            
            if result and result.get('score', 0) > 0:
                logger.info(f"✅ GROQ evaluation successful: {result.get('score')}/100")
                return result
            else:
                logger.warning("⚠️ GROQ returned invalid result, trying reference answers...")
        except Exception as e:
            logger.warning(f"⚠️ GROQ failed: {str(e)}, trying reference answers...")
        
        # Fallback: Find matching reference answer
        reference = None
        for key, ref in self.reference_answers.items():
            if any(word in question_lower for word in key.split()):
                reference = ref
                logger.info(f"📚 Found reference answer for key: {key}")
                break
        
        if not reference:
            # Generic scoring if no reference found
            logger.info("📝 No reference answer, using smart keyword evaluation")
            return self._generic_score(answer_lower, original_question)
        
        # Multi-criteria scoring (like HackerRank)
        
        # 1. Keyword/Concept Coverage (40%)
        keyword_score = self._score_keyword_coverage(answer_lower, reference['keywords'])
        
        # 2. Key Concepts Coverage (40%)
        concept_score = self._score_concept_coverage(answer_lower, reference['key_concepts'])
        
        # 3. Communication Quality (20%)
        communication_score = self._score_communication(answer_lower)
        
        # Weighted final score
        technical_accuracy = int((keyword_score + concept_score) / 2)
        completeness = concept_score
        communication = communication_score
        
        final_score = int(
            technical_accuracy * 0.5 +
            completeness * 0.3 +
            communication * 0.2
        )
        
        # Generate detailed feedback
        feedback = self._generate_feedback(
            answer_lower, 
            reference, 
            technical_accuracy, 
            completeness, 
            communication
        )
        
        return {
            "question": original_question,
            "answer": answer_lower[:200],  # Truncate for display
            "score": final_score,
            "max_score": 100,
            "technical_accuracy": technical_accuracy,
            "completeness": completeness,
            "communication": communication,
            "feedback": feedback
        }
    
    def _score_keyword_coverage(self, answer: str, keywords: List[str]) -> int:
        """Score based on keyword presence"""
        if not keywords:
            return 70
        
        matched = sum(1 for kw in keywords if kw.lower() in answer)
        percentage = (matched / len(keywords)) * 100
        
        # Scale to 0-100
        if percentage >= 80:
            return 95
        elif percentage >= 60:
            return 85
        elif percentage >= 40:
            return 70
        elif percentage >= 20:
            return 55
        else:
            return 35
    
    def _score_concept_coverage(self, answer: str, concepts: List[str]) -> int:
        """Score based on key concept coverage"""
        if not concepts:
            return 70
        
        matched = 0
        for concept in concepts:
            # Check if concept words are in answer
            concept_words = concept.lower().split()
            if all(word in answer for word in concept_words):
                matched += 1
            elif any(word in answer for word in concept_words):
                matched += 0.5  # Partial credit
        
        percentage = (matched / len(concepts)) * 100
        
        # Scale to 0-100
        if percentage >= 90:
            return 95
        elif percentage >= 75:
            return 85
        elif percentage >= 50:
            return 70
        elif percentage >= 30:
            return 55
        elif percentage >= 15:
            return 40
        else:
            return 25
    
    def _score_communication(self, answer: str) -> int:
        """Score communication quality"""
        # Length check
        if len(answer) < 20:
            return 40
        elif len(answer) < 50:
            return 60
        elif len(answer) < 100:
            return 75
        else:
            return 85
    
    def _generate_feedback(self, answer: str, reference: Dict, tech_score: int, comp_score: int, comm_score: int) -> str:
        """Generate specific feedback"""
        feedback_parts = []
        
        # Technical accuracy feedback
        if tech_score >= 85:
            feedback_parts.append("✓ Technically accurate answer.")
        elif tech_score >= 70:
            feedback_parts.append("✓ Good technical understanding with minor gaps.")
        elif tech_score >= 50:
            feedback_parts.append("⚠ Partially correct, but missing some technical details.")
        else:
            feedback_parts.append("✗ Technical accuracy needs improvement.")
        
        # Concept coverage feedback
        matched_concepts = []
        missed_concepts = []
        
        for concept in reference['key_concepts']:
            concept_words = concept.lower().split()
            if any(word in answer for word in concept_words):
                matched_concepts.append(concept)
            else:
                missed_concepts.append(concept)
        
        if matched_concepts:
            feedback_parts.append(f"Mentioned: {', '.join(matched_concepts[:3])}")
        
        if missed_concepts and len(missed_concepts) <= 3:
            feedback_parts.append(f"✗ Could add: {', '.join(missed_concepts)}")
        
        return " ".join(feedback_parts)
    
    def _generic_score(self, answer: str, question: str) -> Dict[str, Any]:
        """Generic scoring with AI evaluation for custom questions"""
        import requests
        import json
        
        # Try to use AI for smarter evaluation
        try:
            # Use simple keyword matching for common expansion questions
            question_lower = question.lower()
            answer_lower = answer.lower().strip()
            
            logger.info(f"🔍 Evaluating custom question: {question[:50]}...")
            
            # Try using GROQ for fast AI evaluation (RECOMMENDED!)
            try:
                logger.info("🚀 Attempting GROQ evaluation...")
                from services.groq_evaluator import GroqEvaluator
                evaluator = GroqEvaluator()
                logger.info("✅ GROQ evaluator imported successfully")
                
                result = evaluator.evaluate_answer(question, answer)
                logger.info(f"📊 GROQ returned score: {result.get('score', 'N/A')}")
                
                if result and result.get('score', 0) > 0:
                    logger.info(f"✅ Using GROQ AI evaluation for: {question[:50]}...")
                    return result
                else:
                    logger.warning("⚠️ GROQ returned invalid score, using fallback")
            except Exception as e:
                logger.error(f"❌ GROQ evaluation failed: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Fallback to smart keyword evaluation
            from services.smart_keyword_evaluator import SmartKeywordEvaluator
            keyword_evaluator = SmartKeywordEvaluator()
            return keyword_evaluator.evaluate(question, answer)
            
            # For other questions, use length-based scoring as fallback
            length = len(answer)
            
            if length >= 100:
                score = 75
                feedback = "Detailed answer provided. Ensure technical accuracy."
            elif length >= 50:
                score = 60
                feedback = "Good attempt. Could provide more detail."
            elif length >= 20:
                score = 45
                feedback = "Basic answer. Needs more explanation."
            else:
                score = 25
                feedback = "Answer too brief. Provide more detail."
            
            return {
                "question": question,
                "answer": answer[:200],
                "score": score,
                "max_score": 100,
                "technical_accuracy": score,
                "completeness": score - 10,
                "communication": score - 5,
                "feedback": feedback
            }
        except Exception as e:
            # Fallback to basic scoring
            return {
                "question": question,
                "answer": answer[:200],
                "score": 50,
                "max_score": 100,
                "technical_accuracy": 50,
                "completeness": 45,
                "communication": 50,
                "feedback": "Answer received. Manual review recommended."
            }
    
    def _evaluate_expansion_question(self, question: str, answer: str) -> Dict[str, Any]:
        """Evaluate expansion/acronym questions accurately"""
        question_lower = question.lower()
        answer_lower = answer.lower().strip()
        
        # Define correct expansions
        expansions = {
            'html': {
                'correct': ['hyper text markup language', 'hypertext markup language'],
                'keywords': ['hyper', 'text', 'markup', 'language']
            },
            'css': {
                'correct': ['cascading style sheets', 'cascading style sheet'],
                'keywords': ['cascading', 'style', 'sheets', 'sheet']
            },
            'js': {
                'correct': ['javascript'],
                'keywords': ['javascript']
            },
            'javascript': {
                'correct': ['javascript'],
                'keywords': ['javascript']
            },
            'sql': {
                'correct': ['structured query language'],
                'keywords': ['structured', 'query', 'language']
            },
            'api': {
                'correct': ['application programming interface'],
                'keywords': ['application', 'programming', 'interface']
            },
            'url': {
                'correct': ['uniform resource locator'],
                'keywords': ['uniform', 'resource', 'locator']
            },
            'http': {
                'correct': ['hypertext transfer protocol', 'hyper text transfer protocol'],
                'keywords': ['hypertext', 'transfer', 'protocol']
            },
            'https': {
                'correct': ['hypertext transfer protocol secure', 'hyper text transfer protocol secure'],
                'keywords': ['hypertext', 'transfer', 'protocol', 'secure']
            }
        }
        
        # Find which acronym is being asked
        acronym_found = None
        for acronym in expansions.keys():
            if acronym in question_lower:
                acronym_found = acronym
                break
        
        if not acronym_found:
            # Can't determine acronym, use basic scoring
            return {
                "question": question,
                "answer": answer[:200],
                "score": 50,
                "max_score": 100,
                "technical_accuracy": 50,
                "completeness": 50,
                "communication": 50,
                "feedback": "Answer provided. Unable to verify accuracy automatically."
            }
        
        expansion_data = expansions[acronym_found]
        
        # Check if answer matches correct expansion
        is_correct = any(correct in answer_lower for correct in expansion_data['correct'])
        
        if is_correct:
            # Correct answer!
            score = 95
            feedback = f"✓ Correct! {acronym_found.upper()} stands for {expansion_data['correct'][0].title()}."
            return {
                "question": question,
                "answer": answer[:200],
                "score": score,
                "max_score": 100,
                "technical_accuracy": 95,
                "completeness": 90,
                "communication": 85,
                "feedback": feedback
            }
        else:
            # Check if partially correct (has some keywords)
            keywords_found = sum(1 for kw in expansion_data['keywords'] if kw in answer_lower)
            keyword_percentage = (keywords_found / len(expansion_data['keywords'])) * 100
            
            if keyword_percentage >= 75:
                score = 70
                feedback = f"⚠ Partially correct. {acronym_found.upper()} = {expansion_data['correct'][0].title()}"
            elif keyword_percentage >= 50:
                score = 50
                feedback = f"✗ Incomplete. {acronym_found.upper()} stands for {expansion_data['correct'][0].title()}"
            else:
                score = 25
                feedback = f"✗ Incorrect. {acronym_found.upper()} = {expansion_data['correct'][0].title()}"
            
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
    
    def _generate_overall_feedback(self, overall: int, technical: int, completeness: int, communication: int) -> str:
        """Generate overall performance feedback"""
        if overall >= 85:
            return f"Excellent performance! Strong technical knowledge ({technical}%) with comprehensive answers ({completeness}%). Clear communication ({communication}%)."
        elif overall >= 70:
            return f"Good performance overall. Solid technical understanding ({technical}%) with room for more complete answers ({completeness}%). Communication is effective ({communication}%)."
        elif overall >= 55:
            return f"Satisfactory performance. Technical knowledge is developing ({technical}%). Work on providing more complete answers ({completeness}%) and clearer explanations ({communication}%)."
        else:
            return f"Performance needs improvement. Focus on building technical knowledge ({technical}%), providing complete answers ({completeness}%), and clear communication ({communication}%)."
    
    def _generate_recommendations(self, tech_scores: List[int], comp_scores: List[int], comm_scores: List[int]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        avg_tech = sum(tech_scores) / len(tech_scores) if tech_scores else 0
        avg_comp = sum(comp_scores) / len(comp_scores) if comp_scores else 0
        avg_comm = sum(comm_scores) / len(comm_scores) if comm_scores else 0
        
        if avg_tech < 70:
            recommendations.append("Review technical fundamentals and core concepts")
        if avg_comp < 70:
            recommendations.append("Practice providing more comprehensive answers covering all key points")
        if avg_comm < 70:
            recommendations.append("Work on articulating thoughts clearly and concisely")
        
        if not recommendations:
            recommendations.append("Continue practicing to maintain strong performance")
            recommendations.append("Explore advanced topics in your domain")
        
        return recommendations[:3]
    
    def _identify_strengths_weaknesses(self, question_scores: List[Dict]) -> tuple:
        """Identify specific strengths and weaknesses"""
        strengths = []
        weaknesses = []
        
        for qs in question_scores:
            if qs['score'] >= 80:
                strengths.append(f"Strong answer on: {qs['question'][:50]}...")
            elif qs['score'] < 50:
                weaknesses.append(f"Needs improvement on: {qs['question'][:50]}...")
        
        if not strengths:
            strengths.append("Completed the interview")
        if not weaknesses:
            weaknesses.append("None identified - maintain current level")
        
        return strengths[:3], weaknesses[:3]
