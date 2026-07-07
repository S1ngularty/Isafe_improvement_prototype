from pydantic import BaseModel


class EmailModel(BaseModel):
    to: str
    subject: str
    body: str
    
