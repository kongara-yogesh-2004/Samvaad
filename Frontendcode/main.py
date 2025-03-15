from fastapi import FastAPI, HTTPException, Body
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
import uvicorn
import google.generativeai as genai
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI(title="Interview Response Validation API", version="1.0.0")

# Enable CORS to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini API
API_KEY = "AIzaSyB6ayq-PhDRtTuTSvSJx6QnKRiXP9ZRkYc"
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Pydantic models for request and response validation
class ValidationRequest(BaseModel):
    question: str = Field(..., description="The interview question asked")
    response: str = Field(..., description="The candidate's response")
    context: Optional[str] = Field(None, description="Context about the interview")

class ValidationResponse(BaseModel):
    overall_score: float = Field(..., description="Overall score (0-100)")
    criteria_scores: Dict[str, float] = Field(..., description="Scores for each criterion")
    feedback: str = Field(..., description="Detailed feedback")
    strengths: List[str] = Field(..., description="List of strengths")
    weaknesses: List[str] = Field(..., description="List of weaknesses")
    is_satisfactory: bool = Field(..., description="Whether response meets requirements")

# Helper function for validation
def validate_response_helper(question: str, response: str, context: Optional[str] = None) -> Dict[str, Any]:
    """Validates a candidate's interview response using Google's Gemini API."""

    if not question or not response:
        return {
            "error": "Missing question or response",
            "overall_score": 0,
            "criteria_scores": {},
            "feedback": "Invalid input. Please provide a response.",
            "strengths": [],
            "weaknesses": [],
            "is_satisfactory": False
        }

    system_prompt = f"""
    You are an expert interviewer evaluating candidate responses.
    Question: {question}
    Candidate Response: {response}
    {f"Context: {context}" if context else ""}

    Provide the evaluation in JSON format:
    {{
        "overall_score": (0-100 float),
        "criteria_scores": {{
            "relevance": (0-100 float),
            "clarity": (0-100 float),
            "accuracy": (0-100 float)
        }},
        "feedback": "Detailed explanation of response quality",
        "strengths": ["Point 1", "Point 2"],
        "weaknesses": ["Point 1", "Point 2"],
        "is_satisfactory": (true/false)
    }}
    """

    response = model.generate_content(system_prompt)

    try:
        result = response.text

        if "```json" in result:
            result = result.split("```json")[1].split("```")[0].strip()
        elif "```" in result:
            result = result.split("```")[1].split("```")[0].strip()

        evaluation = json.loads(result)

        required_keys = ["overall_score", "criteria_scores", "feedback", "strengths", "weaknesses"]
        for key in required_keys:
            if key not in evaluation:
                evaluation[key] = [] if key in ["strengths", "weaknesses"] else 0 if key == "overall_score" else "N/A"

        evaluation["is_satisfactory"] = evaluation.get("overall_score", 0) >= 70

        return evaluation
    except Exception as e:
        return {
            "error": f"Failed to parse Gemini response: {str(e)}",
            "overall_score": 0,
            "criteria_scores": {},
            "feedback": "Error processing response.",
            "strengths": [],
            "weaknesses": [],
            "is_satisfactory": False
        }

@app.post("/validate", response_model=ValidationResponse)
async def validate(request: ValidationRequest = Body(...)):
    print("Received request:", request.dict())  # Debugging

    if request.response.strip().lower() in ["i don't understand", "can you rephrase?"]:
        return {
            "overall_score": 0,
            "criteria_scores": {},
            "feedback": "Rephrasing the question. Please answer again.",
            "strengths": [],
            "weaknesses": [],
            "is_satisfactory": False
        }

    result = validate_response_helper(
        question=request.question,
        response=request.response,
        context=request.context
    )

    if "error" in result:
        return {
            "overall_score": 0,
            "criteria_scores": {},
            "feedback": "Unable to validate response, proceeding with interview.",
            "strengths": [],
            "weaknesses": [],
            "is_satisfactory": True
        }

    return result

@app.get("/health")
async def health_check():
    return {"status": "healthy", "api_version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
