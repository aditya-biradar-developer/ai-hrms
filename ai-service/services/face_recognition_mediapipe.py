"""
Face Recognition Service using MediaPipe
Works on Python 3.13+ without compilation issues
"""

import mediapipe as mp
import cv2
import numpy as np
import base64
import io
from PIL import Image
import json
import logging

logger = logging.getLogger(__name__)

class FaceRecognitionService:
    def __init__(self):
        # Initialize MediaPipe Face Detection and Face Mesh
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1,  # 1 for full range, 0 for short range
            min_detection_confidence=0.5
        )
        
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5
        )
        
        self.tolerance = 0.6  # Similarity threshold
        
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
    
    def extract_face_landmarks(self, image_array):
        """
        Extract face landmarks using MediaPipe
        Returns 468 3D landmarks as a flattened array
        """
        try:
            # Convert to RGB for MediaPipe
            image_rgb = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
            
            # Detect faces first
            detection_results = self.face_detection.process(image_rgb)
            
            if not detection_results.detections:
                raise ValueError("No face detected in the image")
            
            if len(detection_results.detections) > 1:
                logger.warning(f"Multiple faces detected ({len(detection_results.detections)}), using the first one")
            
            # Get face mesh landmarks
            mesh_results = self.face_mesh.process(image_rgb)
            
            if not mesh_results.multi_face_landmarks:
                raise ValueError("Could not extract face landmarks")
            
            # Extract landmarks (468 points, each with x, y, z)
            landmarks = mesh_results.multi_face_landmarks[0]
            
            # Flatten landmarks into a 1D array (468 * 3 = 1404 dimensions)
            encoding = []
            for landmark in landmarks.landmark:
                encoding.extend([landmark.x, landmark.y, landmark.z])
            
            logger.info(f"Face landmarks extracted successfully. Encoding length: {len(encoding)}")
            return encoding
            
        except Exception as e:
            logger.error(f"Error extracting face landmarks: {str(e)}")
            raise
    
    def encode_face(self, image_array):
        """
        Extract face encoding from image
        Returns the face landmark encoding
        """
        return self.extract_face_landmarks(image_array)
    
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
    
    def calculate_similarity(self, encoding1, encoding2):
        """
        Calculate cosine similarity between two face encodings
        Returns similarity score (0-1, higher is more similar)
        """
        try:
            # Convert to numpy arrays
            vec1 = np.array(encoding1)
            vec2 = np.array(encoding2)
            
            # Normalize vectors
            vec1_norm = vec1 / np.linalg.norm(vec1)
            vec2_norm = vec2 / np.linalg.norm(vec2)
            
            # Calculate cosine similarity
            similarity = np.dot(vec1_norm, vec2_norm)
            
            # Convert to 0-1 range
            similarity = (similarity + 1) / 2
            
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {str(e)}")
            raise
    
    def compare_faces(self, known_encoding, unknown_encoding, tolerance=None):
        """
        Compare two face encodings
        Returns True if they match
        """
        if tolerance is None:
            tolerance = self.tolerance
        
        try:
            # Calculate similarity
            similarity = self.calculate_similarity(known_encoding, unknown_encoding)
            
            # Check if match (similarity above threshold)
            is_match = similarity >= tolerance
            
            # Calculate confidence (0-100)
            confidence = similarity * 100
            
            # Distance (inverse of similarity)
            distance = 1 - similarity
            
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
    
    def detect_duplicate_face(self, new_encoding, existing_faces_db, threshold=0.7):
        """
        Check if a face already exists in the database
        Higher threshold = stricter duplicate detection (0.7 recommended)
        
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
