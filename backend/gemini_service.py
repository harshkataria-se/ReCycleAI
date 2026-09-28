import os
import json
import time
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("recycleai.gemini")

class WasteItemAnalysis(BaseModel):
    category: str = Field(
        description="General category of the object, e.g. Plastic, Paper/Cardboard, Glass, Metal, Organic, Electronic, or Mixed Waste."
    )
    material: str = Field(
        description="Primary material of the object, e.g. PET Plastic, Aluminum, Corrugated Cardboard, Glass, Organic Matter, etc."
    )
    label: str = Field(
        description="Specific name or common label of the item, e.g. Water Bottle, Soda Can, Apple Core, Cardboard Box, Coffee Cup."
    )
    confidence: float = Field(
        description="Confidence score between 0.0 and 1.0 indicating visual recognition certainty."
    )
    explanation: str = Field(
        description="A concise factual explanation of the visible item and its material characteristics without prescriptive disposal decisions."
    )

def resolve_gemini_model_id(client: genai.Client) -> str:
    """
    Verifies the actual available Gemini model identifier from the API
    prioritizing Gemini 3.7 / 3.8 models, falling back to gemini-3.7-flash.
    """
    preferred_models = [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-2.5-flash",
        "gemini-flash-latest"
    ]
    
    try:
        available_models = [m.name for m in client.models.list() if m.name]
        # Check available models for preferred candidates
        for pref in preferred_models:
            for avail in available_models:
                if avail.endswith(pref) or avail == pref or f"models/{pref}" == avail:
                    return pref
    except Exception as e:
        logger.warning(f"Could not dynamically query model list: {e}")

    # Default model identifier for Gemini 3.7 Vision
    return "gemini-3.7-flash"

def analyze_image_with_gemini(image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
    """
    Sends an uploaded image to Gemini Vision with structured JSON output schema.
    Returns category, material, label, confidence, and short explanation.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not configured on the backend. Please set GEMINI_API_KEY in backend/.env"
        )

    client = genai.Client(api_key=api_key)
    model_id = resolve_gemini_model_id(client)

    prompt = (
        "Analyze the object or waste item visible in this image. "
        "Identify the item, its general category, primary material, confidence score, "
        "and provide a short factual description of what is seen. "
        "Do not make recycling/disposal decisions."
    )

    max_retries = 2
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=mime_type or "image/jpeg",
                    ),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=WasteItemAnalysis,
                    temperature=0.1,
                ),
            )

            if not response.text:
                raise ValueError("Gemini returned an empty response.")

            data = json.loads(response.text)
            return {
                "category": data.get("category", "Uncategorized"),
                "material": data.get("material", "Unknown Material"),
                "label": data.get("label", "Unknown Item"),
                "confidence": round(float(data.get("confidence", 0.9)), 4),
                "explanation": data.get("explanation", ""),
                "model_used": model_id,
            }
        except Exception as e:
            last_exception = e
            error_str = str(e)
            # Only retry on transient 503 UNAVAILABLE errors
            if "503" in error_str and attempt < max_retries:
                delay = (2 ** attempt) * 1.5  # ~1.5s, ~3s
                logger.warning(
                    f"Gemini 503 UNAVAILABLE (attempt {attempt + 1}/{max_retries + 1}), "
                    f"retrying in {delay:.1f}s..."
                )
                time.sleep(delay)
                continue
            # All other errors or final retry exhausted — propagate immediately
            logger.error(f"Gemini API analysis failed: {e}")
            raise RuntimeError(f"Gemini Vision classification error: {error_str}")
