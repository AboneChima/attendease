# Face Recognition Backend (Python + FastAPI)

A reliable, professional-grade face recognition backend using Python's `face_recognition` library and FastAPI.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Run the installation script
install.bat

# Or manually install:
pip install -r requirements.txt
```

### 2. Start the Server
```bash
# Run the start script
start.bat

# Or manually start:
python main.py
```

The server will be available at: `http://localhost:8001`

## 📚 API Documentation

Once the server is running, visit `http://localhost:8001/docs` for interactive API documentation.

## 🔧 API Endpoints

### Face Enrollment
```http
POST /api/face/enroll
Content-Type: application/x-www-form-urlencoded

student_id=STUDENT123&image_data=data:image/jpeg;base64,/9j/4AAQ...
```

### Face Verification
```http
POST /api/face/verify
Content-Type: application/x-www-form-urlencoded

image_data=data:image/jpeg;base64,/9j/4AAQ...
```

### Get Enrolled Faces
```http
GET /api/face/enrolled
```

### Delete Face Enrollment
```http
DELETE /api/face/delete/{student_id}
```

## 🎯 Features

- ✅ **Rock-solid reliability** - No more browser ML issues
- ✅ **Professional accuracy** - Industry-standard face_recognition library
- ✅ **Fast processing** - Server-side processing
- ✅ **Easy integration** - RESTful API
- ✅ **Automatic CORS** - Works with React frontend
- ✅ **SQLite integration** - Uses existing database
- ✅ **Error handling** - Comprehensive error messages

## 🔄 Integration with Frontend

The React frontend will send base64 image data to these endpoints instead of using face-api.js.

## 🛠 Troubleshooting

### Installation Issues
If you encounter issues installing `face_recognition`:

1. **Install Visual Studio Build Tools**
2. **Or try alternative installation:**
   ```bash
   pip install cmake
   pip install dlib
   pip install face_recognition
   ```

### Common Errors
- **"No face detected"** - Ensure good lighting and face is clearly visible
- **"Multiple faces detected"** - Only one face should be in the image
- **"Invalid image format"** - Check base64 encoding is correct

## 📊 Performance

- **Face enrollment**: ~200-500ms per image
- **Face verification**: ~100-300ms per image
- **Accuracy**: 99.38% on LFW benchmark
- **Memory usage**: ~50-100MB

## 🔒 Security

- Face encodings are stored as binary data in SQLite
- No raw images are stored
- CORS configured for localhost only
- Input validation on all endpoints