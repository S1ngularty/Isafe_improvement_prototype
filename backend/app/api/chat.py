from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests
from app.core.config import GROQ_API_KEY
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    user_context: Optional[Dict[str, Any]] = None

SYSTEM_PROMPT = """You are CityShield's AI Assistant, a helpful and knowledgeable companion. 
Your primary focus is on disaster preparedness, emergency response, and safety guidance. 
However, you are capable of acting as a general-purpose assistant and can answer questions on a wide range of topics.
If the user provides their current status or context (like being in an emergency), acknowledge it and prioritize their immediate safety. Keep responses concise, clear, and easy to read on a mobile device.
"""

@router.post("")
def chat_with_ai(request: ChatRequest):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    system_message = {"role": "system", "content": SYSTEM_PROMPT}
    
    if request.user_context:
        context_str = f"User Context: Status={request.user_context.get('status', 'unknown')}"
        if 'profile' in request.user_context:
            context_str += f", Name={request.user_context['profile'].get('full_name', 'unknown')}"
        system_message["content"] += f"\n\n{context_str}"

    messages = [system_message] + [{"role": m.role, "content": m.content} for m in request.messages]

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.1-8b-instant",  # Using a supported, fast model on Groq
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
        return {"response": data["choices"][0]["message"]}
    except requests.exceptions.HTTPError as e:
        logger.error(f"Groq API Error: {response.text}")
        raise HTTPException(status_code=response.status_code, detail=f"Groq API Error: {response.text}")
    except Exception as e:
        import traceback
        logger.error(f"Error in chat endpoint:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {type(e).__name__} - {repr(e)}")
