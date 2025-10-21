"""
Face Recognition Service
Uses face_recognition library for encoding and matching faces
"""

import face_recognition
import numpy as np
import base64
import io
from PIL import Image
import json
import logging

logger = logging.getLogger(__name__)

class FaceRecognitionService:
    def __init__(self):
        self.tolerance = 0.6  # Lower is more strict (0.6 is default)
        self.model = 'large'  # 'large' or 'small' - large is more accurate
        
    def decode_base64_image(self, base64_string):
        """
        Decode base64 image string to numpy array
        """
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            # Decode base64
            image_data = base64.b64decode(base64_string)
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Convert to numpy array
            image_array = np.array(image)
            
            return image_array
        except Exception as e:
            logger.error(f"Error decoding image: {str(e)}")
            raise ValueError(f"Invalid image data: {str(e)}")
    
    def encode_face(self, image_array):
        """
        Extract face encoding from image
        Returns the 128-dimensional face encoding
        """
        try:
            # Find all faces in the image
            face_locations = face_recognition.face_locations(image_array, model=self.model)
            
            if len(face_locations) == 0:
                raise ValueError("No face detected in the image")
            
            if len(face_locations) > 1:
                logger.warning(f"Multiple faces detected ({len(face_locations)}), using the first one")
            
            # Get face encodings
            face_encodings = face_recognition.face_encodings(
                image_array, 
                face_locations,
                model=self.model
            )
            
            if len(face_encodings) == 0:
                raise ValueError("Could not encode the detected face")
            
            # Return the first face encoding as a list
            encoding = face_encodings[0].tolist()
            
            logger.info(f"Face encoded successfully. Encoding length: {len(encoding)}")
            return encoding
            
        except Exception as e:
            logger.error(f"Error encoding face: {str(e)}")
            raise
    
    def register_face(self, user_id, base64_image):
        """
        Register a user's face
        Returns the face encoding as JSON string
        """
        try:
            logger.info(f"Registering face for user: {user_id}")
            
            # Decode image
            image_array = self.decode_base64_image(base64_image)
            
            # Extract face encoding
            encoding = self.encode_face(image_array)
            
            # Convert to JSON string for storage
            encoding_json = json.dumps(encoding)
            
            return {
                'success': True,
                'user_id': user_id,
                'face_encoding': encoding_json,
                'encoding_length': len(encoding)
            }
            
        except Exception as e:
            logger.error(f"Face registration failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def compare_faces(self, known_encoding, unknown_encoding, tolerance=None):
        """
        Compare two face encodings
        Returns True if they match
        """
        if tolerance is None:
            tolerance = self.tolerance
        
        try:
            # Convert to numpy arrays
            known = np.array(known_encoding)
            unknown = np.array(unknown_encoding)
            
            # Calculate face distance
            distance = face_recognition.face_distance([known], unknown)[0]
            
            # Check if match
            is_match = distance <= tolerance
            
            # Calculate confidence (inverse of distance, normalized to 0-100)
            confidence = max(0, min(100, (1 - distance) * 100))
            
            return is_match, confidence, distance
            
        except Exception as e:
            logger.error(f"Error comparing faces: {str(e)}")
            raise
    
    def recognize_face(self, base64_image, known_faces_db):
        """
        Recognize a face from a database of known faces
        
        Args:
            base64_image: Base64 encoded image
            known_faces_db: List of dicts with 'user_id' and 'face_encoding' (JSON string)
        
        Returns:
            dict with user_id, confidence, and match status
        """
        try:
            logger.info(f"Recognizing face from {len(known_faces_db)} known faces")
            
            # Decode and encode the unknown face
            image_array = self.decode_base64_image(base64_image)
            unknown_encoding = self.encode_face(image_array)
            
            best_match = None
            best_confidence = 0
            best_distance = float('inf')
            
            # Compare with all known faces
            for known_face in known_faces_db:
                try:
                    # Parse the stored encoding
                    known_encoding = json.loads(known_face['face_encoding'])
                    
                    # Compare faces
                    is_match, confidence, distance = self.compare_faces(
                        known_encoding, 
                        unknown_encoding
                    )
                    
                    logger.debug(f"User {known_face['user_id']}: match={is_match}, confidence={confidence:.2f}%, distance={distance:.4f}")
                    
                    # Keep track of best match
                    if is_match and confidence > best_confidence:
                        best_match = known_face['user_id']
                        best_confidence = confidence
                        best_distance = distance
                        
                except Exception as e:
                    logger.error(f"Error comparing with user {known_face.get('user_id')}: {str(e)}")
                    continue
            
            if best_match:
                logger.info(f"Face recognized: User {best_match} with {best_confidence:.2f}% confidence")
                return {
                    'success': True,
                    'user_id': best_match,
                    'confidence': round(best_confidence, 2),
                    'distance': round(best_distance, 4)
                }
            else:
                logger.warning("No matching face found")
                return {
                    'success': False,
                    'error': 'No matching face found',
                    'confidence': 0
                }
                
        except Exception as e:
            logger.error(f"Face recognition failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def detect_duplicate_face(self, new_encoding, existing_faces_db, threshold=0.4):
        """
        Check if a face already exists in the database
        Lower threshold = stricter duplicate detection
        
        Returns:
            dict with is_duplicate, matched_user_id, and confidence
        """
        try:
            for existing_face in existing_faces_db:
                try:
                    known_encoding = json.loads(existing_face['face_encoding'])
                    
                    is_match, confidence, distance = self.compare_faces(
                        known_encoding,
                        new_encoding,
                        tolerance=threshold
                    )
                    
                    if is_match:
                        return {
                            'is_duplicate': True,
                            'matched_user_id': existing_face['user_id'],
                            'matched_user_name': existing_face.get('name', 'Unknown'),
                            'confidence': round(confidence, 2),
                            'distance': round(distance, 4)
                        }
                        
                except Exception as e:
                    logger.error(f"Error checking duplicate for user {existing_face.get('user_id')}: {str(e)}")
                    continue
            
            return {
                'is_duplicate': False,
                'confidence': 0
            }
            
        except Exception as e:
            logger.error(f"Duplicate detection failed: {str(e)}")
            raise

# Global instance
face_service = FaceRecognitionService()
