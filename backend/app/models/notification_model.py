from pydantic import BaseModel
from typing import Optional, Dict, Any

class NotificationModel(BaseModel):
    token:str
    title:str
    body:str
    data:Optional[Dict[str,Any]] = None
