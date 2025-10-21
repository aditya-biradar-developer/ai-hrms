"""
AI Interview Service
Generates questions and evaluates candidate responses using GROQ (FREE & FAST)
"""

import logging
from typing import Optional, List, Dict, Any
import json
from .professional_evaluator import ProfessionalEvaluator
from .groq_question_generator import GroqQuestionGenerator

logger = logging.getLogger(__name__)

class InterviewService:
    def __init__(self, llm_service, gemini_service=None):
        self.llm = llm_service
        self.gemini = gemini_service
        self.groq_generator = GroqQuestionGenerator()
        self.professional_evaluator = ProfessionalEvaluator()
        logger.info("✅ Interview service initialized with GROQ generator and professional evaluator")
    
    def generate_questions(self, job_title: str, interview_type: str = 'technical', num_questions: int = 5) -> Dict[str, Any]:
        """Generate interview questions based on job title and type"""
        
        # Use Gemini if available for better quality questions
        if self.gemini and self.gemini.is_available():
            try:
                return self._generate_questions_gemini(job_title, interview_type, num_questions)
            except Exception as e:
                logger.error(f"Gemini error, falling back to LLM: {e}")
        
        return self._generate_questions_llm(job_title, interview_type, num_questions)
    
    def generate_questions_by_category(self, job_role: str, category: str, difficulty: str, num_questions: int = 5) -> Dict[str, Any]:
        """Generate interview questions based on job role, category, and difficulty level"""
        
        # Use GROQ first (FREE and ULTRA-FAST)
        try:
            logger.info(f"🚀 Using GROQ for question generation: {num_questions} {difficulty} {category} questions")
            return self.groq_generator.generate_questions(job_role, category, difficulty, num_questions)
        except Exception as e:
            logger.error(f"GROQ error, trying Gemini: {e}")
        
        # Fallback to Gemini if GROQ fails
        if self.gemini and self.gemini.is_available():
            try:
                logger.info("🔄 Falling back to Gemini...")
                return self._generate_questions_by_category_gemini(job_role, category, difficulty, num_questions)
            except Exception as e:
                logger.error(f"Gemini error, using fallback: {e}")
        
        # Final fallback
        logger.info("📝 Using fallback questions...")
        return self._generate_questions_by_category_llm(job_role, category, difficulty, num_questions)
    
    def _generate_questions_gemini(self, job_title: str, interview_type: str, num_questions: int) -> Dict[str, Any]:
        """Generate questions using Gemini AI"""
        prompt = f"""Generate {num_questions} interview questions for a {job_title} position.

Interview Type: {interview_type}

Requirements:
1. Mix of question types: introduction, behavioral, technical, problem-solving
2. Include coding questions for technical roles
3. Each question should have:
   - text: The question text
   - type: Question type (introduction/behavioral/technical/coding)
   - duration: Expected answer duration in seconds (120-300)
   - code: (Optional) Code snippet if it's a coding question
   - language: (Optional) Programming language if code is provided

Return ONLY a valid JSON object with this structure:
{{
  "questions": [
    {{
      "text": "Question text",
      "type": "technical",
      "duration": 180,
      "code": "optional code here",
      "language": "javascript"
    }}
  ],
  "estimated_duration": 25
}}

Generate questions now:"""

        response = self.gemini.generate(prompt, max_tokens=2000, temperature=0.8)
        
        # Try to parse JSON response
        try:
            # Extract JSON from response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                json_str = response[start:end]
                data = json.loads(json_str)
                return data
        except:
            pass
        
        # Fallback if parsing fails
        return self._get_fallback_questions(job_title, interview_type, num_questions)
    
    def _generate_questions_by_category_gemini(self, job_role: str, category: str, difficulty: str, num_questions: int) -> Dict[str, Any]:
        """Generate questions using Gemini AI based on category and difficulty"""
        
        difficulty_descriptions = {
            'easy': 'Entry-level questions suitable for junior candidates or basic understanding',
            'intermediate': 'Mid-level questions for candidates with some experience',
            'advanced': 'Senior-level questions requiring deep expertise and complex problem-solving'
        }
        
        category_descriptions = {
            'technical': 'Technical knowledge, tools, frameworks, and best practices',
            'behavioral': 'Soft skills, teamwork, leadership, and situational responses',
            'general': 'General knowledge about the role, industry, and basic concepts',
            'coding': 'Programming problems, algorithms, and code analysis'
        }
        
        prompt = f"""Generate {num_questions} {difficulty} {category} interview questions for a {job_role} position.

Difficulty Level: {difficulty} - {difficulty_descriptions.get(difficulty, '')}
Category: {category} - {category_descriptions.get(category, '')}
Job Role: {job_role}

Requirements:
1. All questions must be {difficulty} level and {category} focused
2. Questions should be relevant to {job_role} role
3. Each question should have:
   - text: The question text
   - type: Always "{category}"
   - duration: Expected answer duration in seconds (120-300)
   - expected_answer: Brief example of what a good answer should include
   - code_snippet: (Optional) Code snippet if relevant to the question
   - language: (Optional) Programming language if code is provided

For coding questions, include relevant code snippets.
For technical questions, focus on tools/frameworks used by {job_role}.
For behavioral questions, focus on situations relevant to {job_role}.

Return ONLY a valid JSON object with this structure:
{{
  "questions": [
    {{
      "text": "Question text here",
      "type": "{category}",
      "duration": 180,
      "expected_answer": "Brief description of expected answer",
      "code_snippet": "optional code here",
      "language": "javascript"
    }}
  ],
  "metadata": {{
    "job_role": "{job_role}",
    "category": "{category}",
    "difficulty": "{difficulty}",
    "total_questions": {num_questions}
  }}
}}

Generate questions now:"""

        response = self.gemini.generate(prompt, max_tokens=3000, temperature=0.8)
        
        # Try to parse JSON response
        try:
            # Extract JSON from response
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                json_str = response[start:end]
                data = json.loads(json_str)
                return data
        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {e}")
        
        # Fallback if parsing fails
        return self._get_fallback_questions_by_category(job_role, category, difficulty, num_questions)
    
    def _generate_questions_by_category_llm(self, job_role: str, category: str, difficulty: str, num_questions: int) -> Dict[str, Any]:
        """Generate questions using local LLM"""
        return self._get_fallback_questions_by_category(job_role, category, difficulty, num_questions)
    
    def _generate_questions_llm(self, job_title: str, interview_type: str, num_questions: int) -> Dict[str, Any]:
        """Generate questions using local LLM"""
        return self._get_fallback_questions(job_title, interview_type, num_questions)
    
    def _get_fallback_questions(self, job_title: str, interview_type: str, num_questions: int) -> Dict[str, Any]:
        """Fallback questions if AI generation fails"""
        
        questions_bank = {
            'introduction': [
                {
                    'text': 'Tell me about yourself and your professional background.',
                    'type': 'introduction',
                    'duration': 180
                },
                {
                    'text': 'What interests you about this position and our company?',
                    'type': 'introduction',
                    'duration': 120
                }
            ],
            'behavioral': [
                {
                    'text': 'Describe a challenging project you worked on and how you overcame obstacles.',
                    'type': 'behavioral',
                    'duration': 240
                },
                {
                    'text': 'Tell me about a time when you had to work with a difficult team member.',
                    'type': 'behavioral',
                    'duration': 180
                }
            ],
            'technical': [
                {
                    'text': 'Explain the difference between REST and GraphQL APIs.',
                    'type': 'technical',
                    'duration': 180
                },
                {
                    'text': 'What is your approach to debugging complex issues in production?',
                    'type': 'technical',
                    'duration': 240
                }
            ],
            'coding': [
                {
                    'text': 'What will be the output of this code?',
                    'type': 'coding',
                    'duration': 300,
                    'code': '''function example() {
  let x = 1;
  if (true) {
    let x = 2;
    console.log(x);
  }
  console.log(x);
}
example();''',
                    'language': 'javascript'
                },
                {
                    'text': 'Explain what this code does and identify any potential issues.',
                    'type': 'coding',
                    'duration': 300,
                    'code': '''def process_data(data):
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result

print(process_data([1, -2, 3, -4, 5]))''',
                    'language': 'python'
                }
            ]
        }
        
        # Select questions based on interview type
        selected_questions = []
        
        if interview_type.lower() == 'ai' or interview_type.lower() == 'technical':
            # Technical interview: mix of all types
            selected_questions.append(questions_bank['introduction'][0])
            selected_questions.extend(questions_bank['technical'][:2])
            selected_questions.extend(questions_bank['coding'][:2])
        elif interview_type.lower() == 'hr':
            # HR interview: focus on behavioral
            selected_questions.extend(questions_bank['introduction'])
            selected_questions.extend(questions_bank['behavioral'])
        else:
            # General interview
            selected_questions.append(questions_bank['introduction'][0])
            selected_questions.append(questions_bank['behavioral'][0])
            selected_questions.append(questions_bank['technical'][0])
        
        # Limit to requested number
        selected_questions = selected_questions[:num_questions]
        
        # Calculate estimated duration
        total_duration = sum(q['duration'] for q in selected_questions)
        estimated_duration = (total_duration // 60) + 2  # Add 2 min buffer
        
        return {
            'questions': selected_questions,
            'estimated_duration': estimated_duration
        }
    
    def _get_fallback_questions_by_category(self, job_role: str, category: str, difficulty: str, num_questions: int) -> Dict[str, Any]:
        """Fallback questions by category if AI generation fails"""
        
        questions_by_category = {
            'technical': {
                'easy': [
                    {'text': f'What programming languages are you familiar with for {job_role} work?', 'type': 'technical', 'duration': 120, 'expected_answer': 'List relevant languages with basic experience'},
                    {'text': 'Explain what version control is and why it\'s important.', 'type': 'technical', 'duration': 150, 'expected_answer': 'Git, tracking changes, collaboration'},
                    {'text': 'What is the difference between frontend and backend development?', 'type': 'technical', 'duration': 120, 'expected_answer': 'Client-side vs server-side responsibilities'}
                ],
                'intermediate': [
                    {'text': f'Describe your experience with frameworks commonly used in {job_role} development.', 'type': 'technical', 'duration': 180, 'expected_answer': 'Specific frameworks with practical examples'},
                    {'text': 'How do you approach debugging complex technical issues?', 'type': 'technical', 'duration': 200, 'expected_answer': 'Systematic debugging methodology'},
                    {'text': 'Explain the concept of API design and best practices.', 'type': 'technical', 'duration': 240, 'expected_answer': 'REST principles, documentation, versioning'}
                ],
                'advanced': [
                    {'text': f'Design a scalable architecture for a {job_role} application handling millions of users.', 'type': 'technical', 'duration': 300, 'expected_answer': 'Microservices, load balancing, caching strategies'},
                    {'text': 'How would you optimize performance in a large-scale application?', 'type': 'technical', 'duration': 280, 'expected_answer': 'Profiling, caching, database optimization'},
                    {'text': 'Discuss security considerations for modern web applications.', 'type': 'technical', 'duration': 250, 'expected_answer': 'Authentication, authorization, data protection'}
                ]
            },
            'behavioral': {
                'easy': [
                    {'text': f'Why are you interested in working as a {job_role}?', 'type': 'behavioral', 'duration': 120, 'expected_answer': 'Genuine interest and career alignment'},
                    {'text': 'Describe a time when you learned something new quickly.', 'type': 'behavioral', 'duration': 150, 'expected_answer': 'Learning approach and adaptability'},
                    {'text': 'How do you handle feedback on your work?', 'type': 'behavioral', 'duration': 120, 'expected_answer': 'Openness to improvement and growth mindset'}
                ],
                'intermediate': [
                    {'text': 'Tell me about a challenging project you worked on and how you overcame obstacles.', 'type': 'behavioral', 'duration': 200, 'expected_answer': 'Problem-solving skills and persistence'},
                    {'text': 'Describe a situation where you had to work with a difficult team member.', 'type': 'behavioral', 'duration': 180, 'expected_answer': 'Conflict resolution and communication skills'},
                    {'text': 'How do you prioritize tasks when you have multiple deadlines?', 'type': 'behavioral', 'duration': 160, 'expected_answer': 'Time management and prioritization strategies'}
                ],
                'advanced': [
                    {'text': f'Describe a time when you had to lead a technical decision as a {job_role}.', 'type': 'behavioral', 'duration': 240, 'expected_answer': 'Leadership skills and technical judgment'},
                    {'text': 'Tell me about a time when you had to advocate for a technical solution to non-technical stakeholders.', 'type': 'behavioral', 'duration': 220, 'expected_answer': 'Communication and influence skills'},
                    {'text': 'How do you handle situations where you disagree with your manager\'s technical approach?', 'type': 'behavioral', 'duration': 200, 'expected_answer': 'Professional disagreement and collaboration'}
                ]
            },
            'coding': {
                'easy': [
                    {'text': 'Write a function to reverse a string.', 'type': 'coding', 'duration': 180, 'expected_answer': 'Basic string manipulation', 'code_snippet': '// Write your solution here\nfunction reverseString(str) {\n  // Your code\n}', 'language': 'javascript'},
                    {'text': 'Find the largest number in an array.', 'type': 'coding', 'duration': 150, 'expected_answer': 'Array iteration and comparison', 'code_snippet': '// Write your solution here\nfunction findMax(arr) {\n  // Your code\n}', 'language': 'javascript'},
                    {'text': 'Check if a number is even or odd.', 'type': 'coding', 'duration': 120, 'expected_answer': 'Modulo operation understanding', 'code_snippet': '// Write your solution here\nfunction isEven(num) {\n  // Your code\n}', 'language': 'javascript'}
                ],
                'intermediate': [
                    {'text': 'Implement a function to check if a string is a palindrome.', 'type': 'coding', 'duration': 240, 'expected_answer': 'String manipulation and algorithm thinking', 'code_snippet': '// Write your solution here\nfunction isPalindrome(str) {\n  // Your code\n}', 'language': 'javascript'},
                    {'text': 'Write a function to find duplicate elements in an array.', 'type': 'coding', 'duration': 220, 'expected_answer': 'Hash map or set usage', 'code_snippet': '// Write your solution here\nfunction findDuplicates(arr) {\n  // Your code\n}', 'language': 'javascript'},
                    {'text': 'Implement a basic binary search algorithm.', 'type': 'coding', 'duration': 300, 'expected_answer': 'Binary search logic and complexity understanding', 'code_snippet': '// Write your solution here\nfunction binarySearch(arr, target) {\n  // Your code\n}', 'language': 'javascript'}
                ],
                'advanced': [
                    {'text': 'Design and implement a LRU (Least Recently Used) cache.', 'type': 'coding', 'duration': 400, 'expected_answer': 'Data structure design with hash map and doubly linked list', 'code_snippet': '// Design LRU Cache\nclass LRUCache {\n  constructor(capacity) {\n    // Your implementation\n  }\n}', 'language': 'javascript'},
                    {'text': 'Implement a function to merge two sorted linked lists.', 'type': 'coding', 'duration': 350, 'expected_answer': 'Linked list manipulation and merge logic', 'code_snippet': '// ListNode definition\nclass ListNode {\n  constructor(val, next) {\n    this.val = val;\n    this.next = next || null;\n  }\n}\n\nfunction mergeLists(l1, l2) {\n  // Your code\n}', 'language': 'javascript'},
                    {'text': 'Write a function to find the longest common subsequence of two strings.', 'type': 'coding', 'duration': 380, 'expected_answer': 'Dynamic programming approach', 'code_snippet': '// Write your solution here\nfunction longestCommonSubsequence(str1, str2) {\n  // Your code\n}', 'language': 'javascript'}
                ]
            },
            'general': {
                'easy': [
                    {'text': f'What do you know about the {job_role} role and its responsibilities?', 'type': 'general', 'duration': 120, 'expected_answer': 'Basic understanding of role requirements'},
                    {'text': 'What are your career goals for the next 2-3 years?', 'type': 'general', 'duration': 150, 'expected_answer': 'Clear career direction and growth mindset'},
                    {'text': 'How do you stay updated with technology trends?', 'type': 'general', 'duration': 120, 'expected_answer': 'Continuous learning approach'}
                ],
                'intermediate': [
                    {'text': f'What trends do you see in the {job_role} field that excite you?', 'type': 'general', 'duration': 180, 'expected_answer': 'Industry awareness and passion'},
                    {'text': 'How do you approach learning new technologies or tools?', 'type': 'general', 'duration': 160, 'expected_answer': 'Learning methodology and adaptability'},
                    {'text': 'What do you think makes a successful development team?', 'type': 'general', 'duration': 200, 'expected_answer': 'Team dynamics and collaboration understanding'}
                ],
                'advanced': [
                    {'text': f'How would you mentor a junior {job_role} joining your team?', 'type': 'general', 'duration': 220, 'expected_answer': 'Leadership and knowledge transfer skills'},
                    {'text': 'What role do you think AI and automation will play in software development?', 'type': 'general', 'duration': 240, 'expected_answer': 'Strategic thinking about industry evolution'},
                    {'text': 'How do you balance technical debt with feature development?', 'type': 'general', 'duration': 200, 'expected_answer': 'Strategic technical decision making'}
                ]
            }
        }
        
        # Get questions for the specified category and difficulty
        category_questions = questions_by_category.get(category, {})
        difficulty_questions = category_questions.get(difficulty, [])
        
        # If not enough questions, mix difficulties
        if len(difficulty_questions) < num_questions:
            all_category_questions = []
            for diff_level in ['easy', 'intermediate', 'advanced']:
                all_category_questions.extend(category_questions.get(diff_level, []))
            difficulty_questions = all_category_questions
        
        # Select requested number of questions
        selected_questions = difficulty_questions[:num_questions]
        
        # If still not enough, pad with general questions
        if len(selected_questions) < num_questions:
            general_questions = questions_by_category.get('general', {}).get('intermediate', [])
            remaining = num_questions - len(selected_questions)
            selected_questions.extend(general_questions[:remaining])
        
        # Calculate estimated duration
        total_duration = sum(q['duration'] for q in selected_questions)
        estimated_duration = (total_duration // 60) + 2  # Add 2 min buffer
        
        return {
            'questions': selected_questions,
            'metadata': {
                'job_role': job_role,
                'category': category,
                'difficulty': difficulty,
                'total_questions': len(selected_questions)
            },
            'estimated_duration': estimated_duration
        }
    
    def evaluate_interview(self, questions: List[Dict], answers: List[Dict], job_title: str, candidate_name: str) -> Dict[str, Any]:
        """Evaluate interview responses and generate scores"""
        
        # Use Professional Evaluator (HackerRank-style approach) - ALWAYS works!
        logger.info("🎓 Using Professional Evaluator (HackerRank-style)...")
        return self.professional_evaluator.evaluate_interview(questions, answers, job_title, candidate_name)
    
    def _evaluate_with_gemini(self, questions: List[Dict], answers: List[Dict], job_title: str, candidate_name: str) -> Dict[str, Any]:
        """Evaluate interview using Gemini AI"""
        
        # Format Q&A for evaluation
        qa_text = ""
        for i, (q, a) in enumerate(zip(questions, answers), 1):
            qa_text += f"\nQ{i}: {q.get('text', 'N/A')}\n"
            qa_text += f"A{i}: {a.get('answer', 'No response')}\n"
        
        prompt = f"""You are an experienced technical interviewer evaluating a candidate for a {job_title} position.

Candidate: {candidate_name}

Interview Q&A:
{qa_text}

EVALUATION GUIDELINES - SCORE LIKE A REAL INTERVIEWER:

For EACH answer, evaluate based on:

1. **CORRECTNESS (Most Important - 60%):**
   - Is the answer technically accurate?
   - Does it demonstrate understanding of the concept?
   - Are there any factual errors?
   - Different correct explanations exist - accept variations!

2. **COMPLETENESS (25%):**
   - Does it cover the main points?
   - Are key concepts mentioned?
   - Brief answers can still be correct!

3. **CLARITY (15%):**
   - Is the explanation clear?
   - Can someone understand their point?
   - Communication quality

SCORING SCALE:
- 90-100: Excellent - Accurate, complete, well-explained
- 75-89: Good - Correct core concepts, minor gaps
- 60-74: Satisfactory - Right direction, needs more detail
- 40-59: Partial - Some understanding, significant gaps
- 20-39: Weak - Major misunderstandings
- 0-19: Incorrect or no answer

IMPORTANT RULES:
✓ A SHORT correct answer is better than a LONG wrong answer
✓ Accept different correct explanations (there are multiple ways to be right!)
✓ Give credit for demonstrating understanding even if not perfectly worded
✓ Be FAIR - score on accuracy, not just length
✓ Technical correctness > Answer length

EXAMPLE SCORING:

Question: "What is the difference between id and class in HTML?"
Answer: "ID is unique, class can be reused. ID uses #, class uses ."
Score: 85/100 - Correct core concepts, brief but accurate

Question: "What is the box model in CSS?"
Answer: "Box model includes content, padding, border, and margin"
Score: 90/100 - Complete and accurate

Answer: "Box model is used for creating box designs"
Score: 40/100 - Shows vague understanding but missing key components

Question: "What is React's useEffect?"
Answer: "useEffect runs side effects after render, like fetching data or updating DOM"
Score: 85/100 - Correct understanding with good example

Answer: "It updates the UI when changes are made"
Score: 55/100 - Partially correct but conflates with useState, shows basic understanding

Return ONLY valid JSON:
{{
  "overall_score": 75,
  "performance_level": "Good",
  "question_scores": [
    {{
      "question": "Question text here",
      "answer": "Candidate's answer here",
      "score": 80,
      "max_score": 100,
      "feedback": "Specific constructive feedback - what was correct, what could improve"
    }}
  ],
  "category_scores": [
    {{"name": "Technical Accuracy", "score": 75, "comment": "Understanding of core concepts"}},
    {{"name": "Communication", "score": 80, "comment": "Clarity of explanations"}},
    {{"name": "Completeness", "score": 70, "comment": "Coverage of key points"}},
    {{"name": "Problem-Solving", "score": 75, "comment": "Approach to questions"}}
  ],
  "feedback": "Overall evaluation in 2-3 sentences highlighting key strengths and areas for growth",
  "recommendations": ["Specific actionable recommendation 1", "Specific actionable recommendation 2", "Specific actionable recommendation 3"],
  "strengths": ["Specific strength observed", "Another specific strength"],
  "weaknesses": ["Specific area to improve", "Another area to develop"]
}}

Evaluate NOW with fair, accurate scoring:"""

        response = self.gemini.generate(prompt, max_tokens=2000, temperature=0.3)
        
        # Try to parse JSON response
        try:
            start = response.find('{')
            end = response.rfind('}') + 1
            if start >= 0 and end > start:
                json_str = response[start:end]
                data = json.loads(json_str)
                logger.info(f"✅ Interview evaluated: Score {data.get('overall_score', 0)}/100")
                return data
        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {e}")
        
        # Fallback
        return self._evaluate_basic(questions, answers)
    
    def _evaluate_with_ollama(self, questions: List[Dict], answers: List[Dict], job_title: str, candidate_name: str) -> Dict[str, Any]:
        """Evaluate interview using Ollama - Teacher-like grading based on key points"""
        
        # Format Q&A for evaluation
        qa_text = ""
        for i, (q, a) in enumerate(zip(questions, answers), 1):
            qa_text += f"\nQ{i}: {q.get('text', 'N/A')}\n"
            qa_text += f"A{i}: {a.get('answer', 'No response')}\n"
        
        prompt = f"""You are an experienced technical teacher grading a {job_title} interview exam.

Candidate: {candidate_name}

Interview Answers:
{qa_text}

GRADING INSTRUCTIONS (Grade like a teacher checking key points):

For EACH question:
1. Identify the KEY POINTS that should be in a correct answer
2. Check which key points the candidate mentioned
3. Score based on KEY POINTS covered, NOT answer length
4. Give specific feedback on what was correct and what was missed

SCORING CRITERIA:
- 90-100: Mentioned ALL key points correctly
- 75-89: Mentioned MOST key points correctly  
- 60-74: Mentioned SOME key points correctly
- 40-59: Mentioned FEW key points, shows partial understanding
- 20-39: Mentioned VERY FEW points, major gaps
- 0-19: Wrong answer or no key points mentioned

EVALUATION FORMAT for each answer:
- List the KEY POINTS for this question
- Check which points candidate mentioned ✓
- Check which points candidate missed ✗
- Give score based on points covered
- Provide specific feedback

EXAMPLES:

Q: "What is the difference between id and class in HTML?"
KEY POINTS: 1) ID is unique 2) Class can be reused 3) ID uses # 4) Class uses .

A: "ID is unique, class can be reused. ID uses #, class uses ."
✓ Mentioned: All 4 key points
✗ Missed: None
Score: 90/100 - Excellent! All key concepts covered correctly.

A: "ID and class are CSS selectors. ID for unique elements, class for multiple."
✓ Mentioned: Point 1 (unique), Point 2 (reused)
✗ Missed: Point 3 (#), Point 4 (.)
Score: 70/100 - Good understanding. Mentioned main concepts but missing CSS selector syntax.

Q: "What is the box model in CSS?"
KEY POINTS: 1) Content 2) Padding 3) Border 4) Margin

A: "Box model includes content, padding, border, and margin"
✓ Mentioned: All 4 key points
✗ Missed: None  
Score: 95/100 - Perfect! All components identified.

A: "Box model is used for responsive designs"
✓ Mentioned: General concept
✗ Missed: All 4 components
Score: 30/100 - Shows awareness of box model but doesn't explain the components.

Return ONLY valid JSON:
{{
  "overall_score": 75,
  "performance_level": "Good",
  "question_scores": [
    {{
      "question": "Question text",
      "answer": "Candidate's answer",
      "score": 80,
      "max_score": 100,
      "key_points_total": 4,
      "key_points_mentioned": 3,
      "feedback": "✓ Correctly mentioned: Point A, Point B, Point C. ✗ Missed: Point D. Score reflects key concepts covered."
    }}
  ],
  "category_scores": [
    {{"name": "Technical Accuracy", "score": 75}},
    {{"name": "Completeness", "score": 70}},
    {{"name": "Communication", "score": 80}}
  ],
  "feedback": "Overall assessment based on key points covered",
  "recommendations": ["Study topic X in more detail", "Review concept Y"],
  "strengths": ["Good understanding of A", "Clear explanation of B"],
  "weaknesses": ["Missed key concept C", "Need to review D"]
}}

Evaluate NOW:"""

        try:
            import requests
            
            response = requests.post(
                'http://localhost:11434/api/generate',
                json={
                    'model': 'llama3:latest',
                    'prompt': prompt,
                    'stream': False,
                    'options': {
                        'temperature': 0.2,
                        'num_predict': 2500
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json().get('response', '')
                logger.info(f"📝 Ollama evaluation response length: {len(result)}")
                
                # Parse JSON from response
                start = result.find('{')
                end = result.rfind('}') + 1
                if start >= 0 and end > start:
                    json_str = result[start:end]
                    data = json.loads(json_str)
                    logger.info(f"✅ Interview evaluated: Score {data.get('overall_score', 0)}/100")
                    return data
                else:
                    logger.error("No JSON found in Ollama response")
                    
        except Exception as e:
            logger.error(f"Ollama evaluation error: {e}")
            raise
        
        # If we get here, evaluation failed
        raise Exception("Ollama evaluation failed")
    
    def _evaluate_basic(self, questions: List[Dict], answers: List[Dict]) -> Dict[str, Any]:
        """Basic evaluation without AI"""
        
        # Simple scoring based on answer length and presence
        total_score = 0
        answered = 0
        question_scores = []
        
        for q, answer in zip(questions, answers):
            answer_text = answer.get('answer', '')
            question_text = q.get('text', 'Question')
            
            # Score based on answer length and presence
            if answer_text and len(answer_text) > 20:
                answered += 1
                length_score = min(len(answer_text) / 10, 100)
                score = int(length_score)
                total_score += score
                feedback = f"Good response with {len(answer_text)} characters. "
                if score >= 80:
                    feedback += "Detailed and comprehensive."
                elif score >= 60:
                    feedback += "Adequate detail provided."
                else:
                    feedback += "Could be more detailed."
            else:
                score = 0
                feedback = "No response or insufficient detail provided."
            
            question_scores.append({
                'question': question_text,
                'answer': answer_text or 'No response',
                'score': score,
                'max_score': 100,
                'feedback': feedback
            })
        
        avg_score = (total_score / len(answers)) if answers else 0
        overall_score = int(avg_score)
        
        # Determine performance level
        if overall_score >= 80:
            performance_level = "Excellent"
        elif overall_score >= 60:
            performance_level = "Good"
        elif overall_score >= 40:
            performance_level = "Average"
        else:
            performance_level = "Needs Improvement"
        
        return {
            'overall_score': overall_score,
            'performance_level': performance_level,
            'question_scores': question_scores,
            'category_scores': [
                {'name': 'Response Quality', 'score': overall_score, 'comment': 'Based on answer completeness'},
                {'name': 'Participation', 'score': int((answered / len(questions)) * 100), 'comment': f'Answered {answered}/{len(questions)} questions'}
            ],
            'feedback': f'You answered {answered} out of {len(questions)} questions. Your responses averaged {int(avg_score)}% completeness. Continue practicing your interview skills to improve confidence and detail in your answers.',
            'recommendations': [
                'Practice answering common interview questions',
                'Provide more detailed examples in your responses',
                'Prepare specific stories from your experience',
                'Work on speaking clearly and confidently'
            ],
            'strengths': ['Completed the interview', 'Provided responses to questions'],
            'weaknesses': ['Could provide more detailed answers', 'Practice technical explanations']
        }
