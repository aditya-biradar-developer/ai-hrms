"""
Face Recognition API Routes
"""

from flask import Blueprint, request, jsonify
import logging
from services.face_recognition_deepface import face_service

logger = logging.getLogger(__name__)

face_bp = Blueprint('face', __name__)

@face_bp.route('/face/register', methods=['POST'])
def register_face():
    """
    Register a user's face
    
    Request body:
    {
        "user_id": "uuid",
        "face_image": "base64_encoded_image"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        user_id = data.get('user_id')
        face_image = data.get('face_image')
        
        if not user_id or not face_image:
            return jsonify({
                'success': False,
                'message': 'user_id and face_image are required'
            }), 400
        
        logger.info(f"Registering face for user: {user_id}")
        
        # Register the face
        result = face_service.register_face(user_id, face_image)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Face registered successfully',
                'data': {
                    'user_id': result['user_id'],
                    'face_encoding': result['face_encoding']
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result.get('error', 'Face registration failed')
            }), 400
            
    except Exception as e:
        logger.error(f"Error in register_face: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500


@face_bp.route('/face/recognize', methods=['POST'])
def recognize_face():
    """
    Recognize a face from the database
    
    Request body:
    {
        "face_image": "base64_encoded_image",
        "known_faces": [
            {
                "user_id": "uuid",
                "face_encoding": "json_string",
                "name": "User Name"
            }
        ]
    }
    
    Note: In production, known_faces should be fetched from database
    For now, the backend should send all registered faces
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        face_image = data.get('face_image')
        known_faces = data.get('known_faces', [])
        
        if not face_image:
            return jsonify({
                'success': False,
                'message': 'face_image is required'
            }), 400
        
        if not known_faces or len(known_faces) == 0:
            return jsonify({
                'success': False,
                'message': 'No registered faces to compare against'
            }), 400
        
        logger.info(f"Recognizing face from {len(known_faces)} known faces")
        
        # Recognize the face
        result = face_service.recognize_face(face_image, known_faces)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': 'Face recognized successfully',
                'data': {
                    'user_id': result['user_id'],
                    'confidence': result['confidence']
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result.get('error', 'Face not recognized')
            }), 400
            
    except Exception as e:
        logger.error(f"Error in recognize_face: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500


@face_bp.route('/face/detect-duplicate', methods=['POST'])
def detect_duplicate():
    """
    Check if a face is already registered (duplicate detection)
    
    Request body:
    {
        "face_image": "base64_encoded_image",
        "existing_faces": [
            {
                "user_id": "uuid",
                "face_encoding": "json_string",
                "name": "User Name"
            }
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        face_image = data.get('face_image')
        existing_faces = data.get('existing_faces', [])
        
        if not face_image:
            return jsonify({
                'success': False,
                'message': 'face_image is required'
            }), 400
        
        logger.info(f"Checking for duplicate face among {len(existing_faces)} existing faces")
        
        # First, encode the new face
        image_array = face_service.decode_base64_image(face_image)
        new_encoding = face_service.encode_face(image_array)
        
        # Check for duplicates
        result = face_service.detect_duplicate_face(new_encoding, existing_faces)
        
        if result['is_duplicate']:
            return jsonify({
                'success': True,
                'is_duplicate': True,
                'message': f"This face is already registered for {result['matched_user_name']}",
                'data': {
                    'matched_user_id': result['matched_user_id'],
                    'matched_user_name': result['matched_user_name'],
                    'confidence': result['confidence']
                }
            }), 200
        else:
            return jsonify({
                'success': True,
                'is_duplicate': False,
                'message': 'No duplicate found, face is unique'
            }), 200
            
    except Exception as e:
        logger.error(f"Error in detect_duplicate: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500


@face_bp.route('/face/test', methods=['GET'])
def test_face_service():
    """
    Test endpoint to verify face recognition service is working
    """
    return jsonify({
        'success': True,
        'message': 'Face recognition service is running (DeepFace)',
        'model': face_service.model_name,
        'detector': face_service.detector_backend,
        'tolerance': face_service.tolerance
    }), 200
