"""
Face Recognition Service using DeepFace
Works on Python 3.13+ with pre-trained models
"""

from deepface import DeepFace
import numpy as np
import base64
import io
from PIL import Image
import json
import logging
import tempfile
import os

logger = logging.getLogger(__name__)

class FaceRecognitionService:
    def __init__(self):
        self.model_name = 'Facenet512'  # Options: VGG-Face, Facenet, Facenet512, OpenFace, DeepFace, DeepID, ArcFace
        self.detector_backend = 'opencv'  # Options: opencv, ssd, dlib, mtcnn, retinaface
        self.distance_metric = 'cosine'  # Options: cosine, euclidean, euclidean_l2
        self.tolerance = 0.5  # Lower is stricter for cosine distance (0.5 = balanced)
        
    def decode_base64_image(self, base64_string):
        """
        Decode base64 image string and save to temp file
        DeepFace works with file paths
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
            
            # Save to temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
            image.save(temp_file.name, 'JPEG')
            temp_file.close()
            
            return temp_file.name
            
        except Exception as e:
            logger.error(f"Error decoding image: {str(e)}")
            raise ValueError(f"Invalid image data: {str(e)}")
    
    def encode_face(self, image_path):
        """
        Extract face embedding using DeepFace
        Returns the face embedding vector
        """
        try:
            # Extract embedding
            embedding_objs = DeepFace.represent(
                img_path=image_path,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True
            )
            
            if not embedding_objs or len(embedding_objs) == 0:
                raise ValueError("No face detected in the image")
            
            if len(embedding_objs) > 1:
                logger.warning(f"Multiple faces detected ({len(embedding_objs)}), using the first one")
            
            # Get the embedding (it's a list of floats)
            embedding = embedding_objs[0]['embedding']
            
            logger.info(f"Face encoded successfully. Embedding length: {len(embedding)}")
            return embedding
            
        except Exception as e:
            logger.error(f"Error encoding face: {str(e)}")
            raise
        finally:
            # Clean up temp file
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except:
                    pass
    
    def register_face(self, user_id, base64_image):
        """
        Register a user's face
        Returns the face encoding as JSON string
        """
        try:
            logger.info(f"Registering face for user: {user_id}")
            
            # Decode image to temp file
            image_path = self.decode_base64_image(base64_image)
            
            # Extract face encoding
            encoding = self.encode_face(image_path)
            
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
    
    def calculate_distance(self, encoding1, encoding2):
        """
        Calculate distance between two face encodings
        Uses cosine distance by default
        """
        try:
            vec1 = np.array(encoding1)
            vec2 = np.array(encoding2)
            
            if self.distance_metric == 'cosine':
                # Cosine distance
                distance = 1 - np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
            elif self.distance_metric == 'euclidean':
                # Euclidean distance
                distance = np.linalg.norm(vec1 - vec2)
            else:
                # Euclidean L2
                distance = np.sqrt(np.sum((vec1 - vec2) ** 2))
            
            return float(distance)
            
        except Exception as e:
            logger.error(f"Error calculating distance: {str(e)}")
            raise
    
    def compare_faces(self, known_encoding, unknown_encoding, tolerance=None):
        """
        Compare two face encodings
        Returns True if they match
        """
        if tolerance is None:
            tolerance = self.tolerance
        
        try:
            # Calculate distance
            distance = self.calculate_distance(known_encoding, unknown_encoding)
            
            # Check if match (distance below threshold)
            is_match = distance <= tolerance
            
            # Calculate confidence (inverse of distance, normalized to 0-100)
            # For cosine distance: 0 = identical, 1 = completely different
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
            image_path = self.decode_base64_image(base64_image)
            unknown_encoding = self.encode_face(image_path)
            
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
                    
                    logger.info(f"User {known_face['user_id']}: match={is_match}, confidence={confidence:.2f}%, distance={distance:.4f}")
                    
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
    
    def detect_duplicate_face(self, new_encoding, existing_faces_db, threshold=0.5):
        """
        Check if a face already exists in the database
        Lower threshold = stricter duplicate detection (0.3 recommended for cosine)
        
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
