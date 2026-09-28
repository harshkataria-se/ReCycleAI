import os
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from gemini_service import analyze_image_with_gemini
from waste_rules import evaluate_waste_rules

# Load environment variables from .env
load_dotenv()

app = FastAPI(
    title="ReCycleAI API",
    description="Backend API for AI-powered waste classification using Gemini Vision",
    version="1.0.0"
)

# Enable CORS for development (allowing mobile devices and local web clients)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Health check endpoint to verify backend connectivity."""
    return {
        "status": "ok",
        "service": "ReCycleAI API"
    }

@app.post("/analyze")
async def analyze_waste_image(file: UploadFile = File(...)):
    """
    AI waste image analysis endpoint using Gemini Vision.
    Performs visual object recognition, material identification, and categorization.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No image file provided.")
    
    content_type = file.content_type or ""
    filename = file.filename or "unknown.jpg"
    
    # Validate image mime type or file extension
    valid_extensions = ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif')
    if not (content_type.startswith("image/") or filename.lower().endswith(valid_extensions)):
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file format. Please upload an image file ({', '.join(valid_extensions)})."
        )
    
    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {str(e)}")
        
    file_size = len(contents)
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded image file is empty.")

    # Determine mime type
    mime_type = content_type if content_type.startswith("image/") else "image/jpeg"

    try:
        # Run Gemini Vision analysis
        classification_result = analyze_image_with_gemini(contents, mime_type=mime_type)
    except ValueError as ve:
        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image analysis error: {str(e)}")

    # Apply deterministic waste rules engine
    disposal_guidance = evaluate_waste_rules(
        category=classification_result.get("category"),
        material=classification_result.get("material"),
        label=classification_result.get("label"),
    )

    # Attach guidance fields into classification_result while preserving all Gemini fields
    classification_result.update(disposal_guidance)

    return {
        "status": "success",
        "message": "Image classified successfully",
        "filename": filename,
        "content_type": content_type,
        "size_bytes": file_size,
        "result": classification_result,
        "disposal_guidance": disposal_guidance,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
