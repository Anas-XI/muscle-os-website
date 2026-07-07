from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.llm import chat, chat_stream
from db_adapter import get_user_messages

router = APIRouter()

class ChatRequest(BaseModel):
    user_id: str
    message: str
    model: str = ""

class ChatResponse(BaseModel):
    response: str

class HistoryRequest(BaseModel):
    user_id: str
    limit: int = 20

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    response = await chat(req.user_id, req.message, req.model)
    return ChatResponse(response=response)

@router.post("/chat/history")
async def history_endpoint(req: HistoryRequest):
    messages = get_user_messages(req.user_id, req.limit)
    return {"messages": messages}

@router.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    async def event_stream():
        async for token in chat_stream(req.user_id, req.message, req.model):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream")
