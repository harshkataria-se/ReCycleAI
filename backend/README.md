# ReCycleAI Backend API

FastAPI backend service for ReCycleAI waste classification and circular economy assistant.

## Requirements
* Python 3.10+
* FastAPI & Uvicorn

## Installation & Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the FastAPI development server:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

## Endpoints

* `GET /health`: Health check endpoint.
* `POST /analyze`: Image upload test endpoint. Accepts `multipart/form-data` with `file`.
