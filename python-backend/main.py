from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import sqlite3
import base64
import json
from PIL import Image
import io
import os
import hashlib
import aiofiles
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import time
from deepface import DeepFace
import tensorflow as tf
from sklearn.metrics.pairwise import cosine_similarity
import matplotlib.pyplot as plt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Suppress TensorFlow warnings
tf.get_logger().setLevel('ERROR')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing DeepFace models...")
    try:
        # Pre-load models to avoid cold start delays
        DeepFace.build_model("Facenet512")
        logger.info("Facenet512 model loaded successfully")
        
        # Initialize database
        init_database()
        logger.info("Database initialized successfully")
        
        # Create uploads directory
        os.makedirs("uploads/photos", exist_ok=True)
        logger.info("Upload directories created")
        
        logger.info("DeepFace Face Recognition API started successfully")
    except Exception as e:
        logger.error(f"Failed to initialize: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("DeepFace Face Recognition API shutting down")

app = FastAPI(title="DeepFace Face Recognition API", version="2.0.0", lifespan=lifespan)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_PATH = "../backend/database/attendance.db"
UPLOAD_DIR = "uploads/photos"
SUPPORTED_MODELS = ["Facenet512", "Facenet", "VGG-Face", "OpenFace", "DeepFace"]
DEFAULT_MODEL = "Facenet512"
DETECTOR_BACKEND = "opencv"
SIMILARITY_THRESHOLD = 0.92  # Cosine similarity threshold (0.92+ for very high security and accuracy)
CONFIDENCE_THRESHOLD = 0.8  # Face detection confidence threshold

def get_db_connection():
    """Get database connection to the main attendance database"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise HTTPException(status_code=500, detail="Database connection failed")

def init_database():
    """Initialize database tables if they don't exist"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if photo_face_enrollments table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='photo_face_enrollments'
        """)
        
        if not cursor.fetchone():
            logger.warning("photo_face_enrollments table not found. Please run database reset script.")
        
        conn.close()
        logger.info("Database initialization completed")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

def calculate_photo_hash(image_data: bytes) -> str:
    """Calculate SHA-256 hash of photo for duplicate detection"""
    return hashlib.sha256(image_data).hexdigest()

def assess_photo_quality(image_path: str) -> Dict[str, Any]:
    """Assess photo quality for enrollment"""
    try:
        # Load image
        img = cv2.imread(image_path)
        if img is None:
            return {"quality_score": 0.0, "issues": ["Failed to load image"]}
        
        # Convert to RGB for face detection
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        height, width = img.shape[:2]
        
        issues = []
        quality_factors = {}
        
        # Check image resolution
        min_resolution = 400
        if width < min_resolution or height < min_resolution:
            issues.append(f"Image resolution too low ({width}x{height}). Minimum: {min_resolution}x{min_resolution}")
            quality_factors['resolution'] = 0.3
        else:
            quality_factors['resolution'] = min(1.0, (width * height) / (640 * 480))
        
        # Check brightness
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray)
        if brightness < 50:
            issues.append("Image too dark")
            quality_factors['brightness'] = 0.3
        elif brightness > 200:
            issues.append("Image too bright")
            quality_factors['brightness'] = 0.5
        else:
            quality_factors['brightness'] = 1.0 - abs(brightness - 128) / 128
        
        # Check contrast
        contrast = np.std(gray)
        if contrast < 20:
            issues.append("Low contrast")
            quality_factors['contrast'] = 0.4
        else:
            quality_factors['contrast'] = min(1.0, contrast / 50)
        
        # Check blur (Laplacian variance)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        if blur_score < 100:
            issues.append("Image appears blurry")
            quality_factors['sharpness'] = 0.3
        else:
            quality_factors['sharpness'] = min(1.0, blur_score / 500)
        
        # Calculate overall quality score
        quality_score = np.mean(list(quality_factors.values()))
        
        return {
            "quality_score": round(quality_score, 3),
            "quality_factors": quality_factors,
            "issues": issues,
            "image_stats": {
                "width": width,
                "height": height,
                "brightness": round(brightness, 2),
                "contrast": round(contrast, 2),
                "sharpness": round(blur_score, 2)
            }
        }
    except Exception as e:
        logger.error(f"Photo quality assessment failed: {e}")
        return {"quality_score": 0.0, "issues": [f"Quality assessment failed: {str(e)}"]}

def extract_face_embedding(image_path: str, model_name: str = DEFAULT_MODEL) -> Dict[str, Any]:
    """Extract face embedding using DeepFace with improved error handling"""
    try:
        # First, try with strict detection
        try:
            face_objs = DeepFace.extract_faces(
                img_path=image_path,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True,
                align=True
            )
        except Exception as strict_error:
            # If strict detection fails, try with relaxed detection
            logger.warning(f"Strict face detection failed, trying relaxed detection: {strict_error}")
            try:
                face_objs = DeepFace.extract_faces(
                    img_path=image_path,
                    detector_backend=DETECTOR_BACKEND,
                    enforce_detection=False,
                    align=True
                )
            except Exception as relaxed_error:
                return {
                    "success": False, 
                    "error": f"Face detection failed. Please ensure: 1) Image contains a clear face, 2) Face is well-lit, 3) Face is not too small, 4) Image is at least 400x400 pixels. Error: {str(relaxed_error)}"
                }
        
        if not face_objs:
            return {
                "success": False, 
                "error": "No face detected in image. Please ensure the image contains a clear, well-lit face that occupies a significant portion of the image."
            }
        
        # Get the largest face (most prominent)
        largest_face = max(face_objs, key=lambda x: x.shape[0] * x.shape[1] if hasattr(x, 'shape') else 1)
        
        # Calculate face confidence (area ratio)
        if hasattr(largest_face, 'shape'):
            face_confidence = (largest_face.shape[0] * largest_face.shape[1]) / (224 * 224)  # Normalized to expected size
        else:
            face_confidence = 1.0  # Default confidence if shape not available
        
        # Relaxed confidence threshold for better user experience
        min_confidence = 0.3  # Lower than CONFIDENCE_THRESHOLD for more flexibility
        if face_confidence < min_confidence:
            return {
                "success": False, 
                "error": f"Face too small or unclear (confidence: {face_confidence:.3f}). Please use a larger, clearer image where the face occupies more of the frame."
            }
        
        # Extract embedding with fallback
        try:
            embedding = DeepFace.represent(
                img_path=image_path,
                model_name=model_name,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True
            )
        except Exception as embed_error:
            # Try with relaxed detection for embedding
            logger.warning(f"Strict embedding extraction failed, trying relaxed: {embed_error}")
            embedding = DeepFace.represent(
                img_path=image_path,
                model_name=model_name,
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=False
            )
        
        if not embedding:
            return {"success": False, "error": "Failed to extract face embedding"}
        
        # Get the first (and typically only) embedding
        face_embedding = embedding[0]["embedding"]
        
        return {
            "success": True,
            "embedding": face_embedding,
            "face_confidence": round(face_confidence, 3),
            "model_name": model_name,
            "detector_backend": DETECTOR_BACKEND,
            "embedding_size": len(face_embedding)
        }
        
    except Exception as e:
        logger.error(f"Face embedding extraction failed: {e}")
        return {"success": False, "error": f"Embedding extraction failed: {str(e)}"}

def calculate_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """Calculate cosine similarity between two embeddings"""
    try:
        # Convert to numpy arrays
        emb1 = np.array(embedding1).reshape(1, -1)
        emb2 = np.array(embedding2).reshape(1, -1)
        
        # Calculate cosine similarity
        similarity = cosine_similarity(emb1, emb2)[0][0]
        return float(similarity)
    except Exception as e:
        logger.error(f"Similarity calculation failed: {e}")
        return 0.0

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "DeepFace Face Recognition API",
        "version": "2.0.0",
        "status": "running",
        "supported_models": SUPPORTED_MODELS,
        "default_model": DEFAULT_MODEL
    }

@app.post("/api/face/enroll")
async def enroll_face(
    student_id: str = Form(...),
    photo: UploadFile = File(...),
    model_name: str = Form(DEFAULT_MODEL)
):
    """Enroll a student's face using passport photo"""
    try:
        # Validate model
        if model_name not in SUPPORTED_MODELS:
            raise HTTPException(status_code=400, detail=f"Unsupported model: {model_name}")
        
        # Validate file type
        if not photo.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and save photo
        photo_data = await photo.read()
        photo_hash = calculate_photo_hash(photo_data)
        
        # Create unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{student_id}_{timestamp}_{photo_hash[:8]}.jpg"
        photo_path = os.path.join(UPLOAD_DIR, filename)
        
        # Save photo to disk
        async with aiofiles.open(photo_path, 'wb') as f:
            await f.write(photo_data)
        
        # Assess photo quality
        quality_assessment = assess_photo_quality(photo_path)
        
        if quality_assessment["quality_score"] < 0.5:
            # Clean up saved file
            os.remove(photo_path)
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Photo quality too low for enrollment",
                    "quality_assessment": quality_assessment
                }
            )
        
        # Extract face embedding
        embedding_result = extract_face_embedding(photo_path, model_name)
        
        if not embedding_result["success"]:
            # Clean up saved file
            os.remove(photo_path)
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": embedding_result["error"],
                    "quality_assessment": quality_assessment
                }
            )
        
        # Check for existing enrollment
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, created_at FROM photo_face_enrollments WHERE student_id = ?",
            (student_id,)
        )
        existing = cursor.fetchone()
        
        if existing:
            conn.close()
            os.remove(photo_path)
            return JSONResponse(
                status_code=409,  # Conflict status code is more appropriate
                content={
                    "success": False,
                    "error": f"Student {student_id} is already enrolled (enrolled on {existing[1]}). To re-enroll, please delete the existing enrollment first or contact an administrator.",
                    "error_code": "ALREADY_ENROLLED",
                    "student_id": student_id,
                    "existing_enrollment_date": existing[1],
                    "suggestion": "Use the delete endpoint first, then re-enroll, or contact support for assistance."
                }
            )

        # Check for face uniqueness - prevent same face from being enrolled for different students
        cursor.execute("""
            SELECT student_id, deepface_embedding 
            FROM photo_face_enrollments 
            WHERE is_active = 1
        """)
        all_enrollments = cursor.fetchall()
        
        new_embedding = embedding_result["embedding"]
        
        for enrollment in all_enrollments:
            stored_embedding = json.loads(enrollment["deepface_embedding"])
            similarity = calculate_similarity(new_embedding, stored_embedding)
            
            # If similarity is above threshold, this face is already enrolled
            if similarity >= SIMILARITY_THRESHOLD:
                conn.close()
                os.remove(photo_path)
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": f"This face is already enrolled for student {enrollment['student_id']}. Each face can only be enrolled once.",
                        "duplicate_student_id": enrollment["student_id"],
                        "similarity_score": round(similarity, 3),
                        "threshold_used": SIMILARITY_THRESHOLD
                    }
                )

        # Store enrollment in database
        cursor.execute("""
            INSERT INTO photo_face_enrollments (
                student_id, photo_path, photo_hash, deepface_embedding,
                face_confidence, photo_quality_score, model_name, detector_backend
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            student_id,
            photo_path,
            photo_hash,
            json.dumps(embedding_result["embedding"]),
            embedding_result["face_confidence"],
            quality_assessment["quality_score"],
            model_name,
            DETECTOR_BACKEND
        ))
        
        conn.commit()
        enrollment_id = cursor.lastrowid
        conn.close()
        
        logger.info(f"Successfully enrolled student {student_id} with enrollment ID {enrollment_id}")
        
        return {
            "success": True,
            "message": f"Student {student_id} enrolled successfully",
            "enrollment_id": enrollment_id,
            "face_confidence": embedding_result["face_confidence"],
            "photo_quality_score": quality_assessment["quality_score"],
            "model_name": model_name,
            "embedding_size": embedding_result["embedding_size"]
        }
        
    except Exception as e:
        logger.error(f"Enrollment failed: {e}")
        # Clean up photo if it was saved
        if 'photo_path' in locals() and os.path.exists(photo_path):
            os.remove(photo_path)
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")

@app.post("/api/face/enroll-multi")
async def enroll_multi_face(
    student_id: str = Form(...),
    front_photo: UploadFile = File(...),
    left_profile_photo: UploadFile = File(...),
    right_profile_photo: UploadFile = File(...),
    model_name: str = Form(DEFAULT_MODEL)
):
    """Enroll a student's face using three different angle photos (front, left profile, right profile)"""
    saved_files = []
    try:
        logger.info(f"Starting multi-photo enrollment for student {student_id}")
        
        # Validate model
        if model_name not in SUPPORTED_MODELS:
            raise HTTPException(status_code=400, detail=f"Unsupported model: {model_name}")
        
        # Validate all file types
        photos = [
            ("front", front_photo),
            ("left_profile", left_profile_photo), 
            ("right_profile", right_profile_photo)
        ]
        
        for angle, photo in photos:
            if not photo.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail=f"{angle} photo must be an image")
        
        # Check for existing enrollment
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, created_at FROM photo_face_enrollments WHERE student_id = ?",
            (student_id,)
        )
        existing = cursor.fetchone()
        
        if existing:
            conn.close()
            return JSONResponse(
                status_code=409,  # Conflict status code is more appropriate
                content={
                    "success": False,
                    "error": f"Student {student_id} is already enrolled (enrolled on {existing[1]}). To re-enroll, please delete the existing enrollment first or contact an administrator.",
                    "error_code": "ALREADY_ENROLLED",
                    "student_id": student_id,
                    "existing_enrollment_date": existing[1],
                    "suggestion": "Use the delete endpoint first, then re-enroll, or contact support for assistance."
                }
            )
        
        # Process each photo
        photo_results = []
        embeddings = []
        total_quality_score = 0
        total_face_confidence = 0
        
        for angle, photo in photos:
            logger.info(f"Processing {angle} photo for student {student_id}")
            
            # Read and save photo
            photo_data = await photo.read()
            photo_hash = calculate_photo_hash(photo_data)
            
            # Create unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{student_id}_{angle}_{timestamp}_{photo_hash[:8]}.jpg"
            photo_path = os.path.join(UPLOAD_DIR, filename)
            saved_files.append(photo_path)
            
            # Save photo to disk
            async with aiofiles.open(photo_path, 'wb') as f:
                await f.write(photo_data)
            
            # Assess photo quality
            quality_assessment = assess_photo_quality(photo_path)
            
            if quality_assessment["quality_score"] < 0.4:  # Slightly lower threshold for profile photos
                # Clean up all saved files
                for file_path in saved_files:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": f"{angle} photo quality too low for enrollment",
                        "quality_assessment": quality_assessment,
                        "angle": angle
                    }
                )
            
            # Extract face embedding
            embedding_result = extract_face_embedding(photo_path, model_name)
            
            if not embedding_result["success"]:
                # Clean up all saved files
                for file_path in saved_files:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": f"Failed to extract face from {angle} photo: {embedding_result['error']}",
                        "quality_assessment": quality_assessment,
                        "angle": angle
                    }
                )
            
            # Store results for this photo
            photo_results.append({
                "angle": angle,
                "photo_path": photo_path,
                "photo_hash": photo_hash,
                "embedding": embedding_result["embedding"],
                "face_confidence": embedding_result["face_confidence"],
                "quality_score": quality_assessment["quality_score"]
            })
            
            embeddings.append(embedding_result["embedding"])
            total_quality_score += quality_assessment["quality_score"]
            total_face_confidence += embedding_result["face_confidence"]
        
        # Calculate averages
        avg_quality_score = total_quality_score / len(photos)
        avg_face_confidence = total_face_confidence / len(photos)
        
        # Check for face uniqueness against existing enrollments
        cursor.execute("""
            SELECT student_id, deepface_embedding 
            FROM photo_face_enrollments 
            WHERE is_active = 1
        """)
        all_enrollments = cursor.fetchall()
        
        # Check each new embedding against existing ones
        for i, new_embedding in enumerate(embeddings):
            for enrollment in all_enrollments:
                stored_embedding = json.loads(enrollment["deepface_embedding"])
                similarity = calculate_similarity(new_embedding, stored_embedding)
                
                # If similarity is above threshold, this face is already enrolled
                if similarity >= SIMILARITY_THRESHOLD:
                    # Clean up all saved files
                    for file_path in saved_files:
                        if os.path.exists(file_path):
                            os.remove(file_path)
                    conn.close()
                    return JSONResponse(
                        status_code=400,
                        content={
                            "success": False,
                            "error": f"Face from {photo_results[i]['angle']} photo is already enrolled for student {enrollment['student_id']}",
                            "duplicate_student_id": enrollment["student_id"],
                            "similarity_score": round(similarity, 3),
                            "threshold_used": SIMILARITY_THRESHOLD,
                            "detected_angle": photo_results[i]['angle']
                        }
                    )
        
        # Store all enrollments in database
        enrollment_ids = []
        for result in photo_results:
            # Try to insert with photo_angle column, fallback if column doesn't exist
            try:
                cursor.execute("""
                    INSERT INTO photo_face_enrollments (
                        student_id, photo_path, photo_hash, deepface_embedding,
                        face_confidence, photo_quality_score, model_name, detector_backend,
                        photo_angle
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    student_id,
                    result["photo_path"],
                    result["photo_hash"],
                    json.dumps(result["embedding"]),
                    result["face_confidence"],
                    result["quality_score"],
                    model_name,
                    DETECTOR_BACKEND,
                    result["angle"]
                ))
            except Exception as e:
                if "no column named photo_angle" in str(e).lower():
                    # Fallback: insert without photo_angle column
                    logger.warning("photo_angle column not found, inserting without it")
                    cursor.execute("""
                        INSERT INTO photo_face_enrollments (
                            student_id, photo_path, photo_hash, deepface_embedding,
                            face_confidence, photo_quality_score, model_name, detector_backend
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        student_id,
                        result["photo_path"],
                        result["photo_hash"],
                        json.dumps(result["embedding"]),
                        result["face_confidence"],
                        result["quality_score"],
                        model_name,
                        DETECTOR_BACKEND
                    ))
                else:
                    raise e
            enrollment_ids.append(cursor.lastrowid)
        
        conn.commit()
        conn.close()
        
        logger.info(f"Successfully enrolled student {student_id} with {len(photos)} photos")
        
        return {
            "success": True,
            "message": f"Student {student_id} enrolled successfully with {len(photos)} photos",
            "enrollment_ids": enrollment_ids,
            "photos_processed": len(photos),
            "average_face_confidence": round(avg_face_confidence, 3),
            "average_photo_quality": round(avg_quality_score, 3),
            "model_name": model_name,
            "angles_enrolled": [result["angle"] for result in photo_results],
            "individual_results": [
                {
                    "angle": result["angle"],
                    "face_confidence": result["face_confidence"],
                    "quality_score": result["quality_score"]
                }
                for result in photo_results
            ]
        }
        
    except Exception as e:
        logger.error(f"Multi-photo enrollment failed: {e}")
        # Clean up all saved files on error
        for file_path in saved_files:
            if os.path.exists(file_path):
                os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Multi-photo enrollment failed: {str(e)}")


@app.get("/api/face/enrollments")
async def get_enrollments():
    """Get all face enrollments"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT student_id, face_confidence, photo_quality_score, 
                   model_name, enrollment_date, is_active
            FROM photo_face_enrollments
            ORDER BY enrollment_date DESC
        """)
        
        enrollments = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return {
            "success": True,
            "enrollments": enrollments,
            "total_count": len(enrollments)
        }
        
    except Exception as e:
        logger.error(f"Failed to get enrollments: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get enrollments: {str(e)}")

@app.delete("/api/face/enroll/{student_id}")
async def delete_enrollment(student_id: str):
    """Delete a student's face enrollment"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get photo path before deletion
        cursor.execute(
            "SELECT photo_path FROM photo_face_enrollments WHERE student_id = ?",
            (student_id,)
        )
        result = cursor.fetchone()
        
        if not result:
            conn.close()
            raise HTTPException(status_code=404, detail=f"No enrollment found for student {student_id}")
        
        photo_path = result["photo_path"]
        
        # Delete from database
        cursor.execute(
            "DELETE FROM photo_face_enrollments WHERE student_id = ?",
            (student_id,)
        )
        
        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail=f"No enrollment found for student {student_id}")
        
        conn.commit()
        conn.close()
        
        # Delete photo file
        if os.path.exists(photo_path):
            os.remove(photo_path)
        
        logger.info(f"Successfully deleted enrollment for student {student_id}")
        
        return {
            "success": True,
            "message": f"Enrollment for student {student_id} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete enrollment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete enrollment: {str(e)}")

@app.post("/api/face/verify")
async def verify_face(
    student_id: str = Form(...),
    photo: UploadFile = File(...),
    model_name: str = Form(DEFAULT_MODEL)
):
    """Verify a student's identity using live camera photo"""
    try:
        logger.info(f"Starting face verification for student {student_id} using model {model_name}")
        
        # Validate model
        if model_name not in SUPPORTED_MODELS:
            raise HTTPException(status_code=400, detail=f"Unsupported model: {model_name}")
        
        # Validate file type
        if not photo.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read photo data
        photo_data = await photo.read()
        
        # Save temporary photo for processing
        temp_photo_path = os.path.join(UPLOAD_DIR, f"temp_verify_{student_id}_{int(time.time())}.jpg")
        with open(temp_photo_path, "wb") as f:
            f.write(photo_data)
        
        try:
            # Extract face embedding from live photo
            embedding_result = extract_face_embedding(temp_photo_path, model_name)
            
            if not embedding_result["success"]:
                raise HTTPException(status_code=400, detail=embedding_result["error"])
            
            live_embedding = embedding_result["embedding"]
            
            # Get enrolled embeddings for this student
            conn = sqlite3.connect(DATABASE_PATH)
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT deepface_embedding, model_name FROM photo_face_enrollments WHERE student_id = ? AND is_active = 1",
                (student_id,)
            )
            
            enrollments = cursor.fetchall()
            conn.close()
            
            if not enrollments:
                raise HTTPException(status_code=404, detail=f"No face enrollment found for student {student_id}")
            
            logger.info(f"Found {len(enrollments)} enrollment(s) for student {student_id}")
            
            # Compare with enrolled embeddings
            best_similarity = 0.0
            verification_threshold = 0.6  # Cosine similarity threshold
            
            for enrollment_data, enrolled_model in enrollments:
                # Only compare with embeddings from the same model
                if enrolled_model == model_name:
                    try:
                        # Deserialize enrolled embedding from JSON
                        enrolled_embedding = np.array(json.loads(enrollment_data))
                        
                        # Calculate similarity
                        similarity = calculate_similarity(live_embedding, enrolled_embedding)
                        
                        if similarity > best_similarity:
                            best_similarity = similarity
                            
                        logger.info(f"Similarity with enrolled embedding: {similarity:.4f}")
                        
                    except Exception as e:
                        logger.warning(f"Failed to process enrolled embedding: {e}")
                        continue
            
            # Determine verification result
            verified = best_similarity >= verification_threshold
            
            logger.info(f"Verification result for {student_id}: {verified} (confidence: {best_similarity:.4f})")
            
            return {
                "verified": verified,
                "confidence": float(best_similarity),
                "threshold": verification_threshold,
                "student_id": student_id,
                "model_name": model_name,
                "message": "Identity verified successfully" if verified else "Identity verification failed"
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_photo_path):
                os.remove(temp_photo_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Face verification failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)