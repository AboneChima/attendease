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
from typing import List, Dict, Any
import logging
# import face_recognition  # Temporarily commented out
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_face_table()
    logger.info("Face Recognition API started successfully")
    yield
    # Shutdown
    logger.info("Face Recognition API shutting down")

app = FastAPI(title="Face Recognition API", version="1.0.0", lifespan=lifespan)

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_PATH = "face_database.db"

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_face_table():
    """Initialize face encodings table if it doesn't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS face_encodings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            encoding BLOB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Face Recognition API is running", "status": "healthy", "note": "Face recognition temporarily disabled - installing dependencies"}

@app.post("/api/face/enroll")
async def enroll_face(student_id: str = Form(...), image_data: str = Form(...)):
    """
    Enroll a face for a student (temporarily disabled)
    """
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "message": "Face recognition temporarily disabled - installing dependencies",
            "student_id": student_id
        }
    )

@app.post("/api/face/verify")
async def verify_face(image_data: str = Form(...)):
    """
    Verify a face against enrolled faces (temporarily disabled)
    """
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "message": "Face recognition temporarily disabled - installing dependencies",
            "student_id": None,
            "confidence": 0.0
        }
    )

@app.get("/api/face/enrolled")
async def get_enrolled_faces():
    """
    Get list of enrolled faces
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT student_id, created_at, updated_at 
            FROM face_encodings 
            ORDER BY updated_at DESC
        ''')
        
        enrolled_faces = []
        for row in cursor.fetchall():
            enrolled_faces.append({
                "student_id": row['student_id'],
                "created_at": row['created_at'],
                "updated_at": row['updated_at']
            })
        
        conn.close()
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "enrolled_faces": enrolled_faces,
                "count": len(enrolled_faces)
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get enrolled faces: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)