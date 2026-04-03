from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, sessions, messages
from core.websocket_manager import router as ws_router

app = FastAPI(title="MentorSpace API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", 
    "https://mentor-space-platform-5ymgtmt1g-vinayp9399s-projects.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(ws_router, tags=["websocket"])


@app.get("/")
def root():
    return {"status": "MentorSpace API running"}
