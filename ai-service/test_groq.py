"""
Test GROQ API directly to verify it's working
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test 1: Check API key
api_key = os.getenv('GROQ_API_KEY')
print(f"✓ GROQ_API_KEY exists: {bool(api_key)}")
print(f"  Key length: {len(api_key) if api_key else 0}")
print(f"  Key starts with: {api_key[:10]}..." if api_key else "  No key!")

# Test 2: Try to import evaluator
try:
    from services.groq_evaluator import GroqEvaluator
    print("\n✓ GroqEvaluator imported successfully")
    
    # Test 3: Create instance
    evaluator = GroqEvaluator()
    print("✓ GroqEvaluator instance created")
    
    # Test 4: Evaluate a simple answer
    print("\n📝 Testing evaluation...")
    question = "Which tag is used to add CSS in HTML?"
    answer = "style tag is used to add css in html"
    
    result = evaluator.evaluate_answer(question, answer)
    
    print(f"\n✅ Evaluation Result:")
    print(f"  Score: {result.get('score', 'N/A')}/100")
    print(f"  Technical: {result.get('technical_accuracy', 'N/A')}/100")
    print(f"  Completeness: {result.get('completeness', 'N/A')}/100")
    print(f"  Feedback: {result.get('feedback', 'N/A')}")
    
except ImportError as e:
    print(f"\n❌ Import error: {e}")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
