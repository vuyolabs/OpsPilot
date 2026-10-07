from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.api.routes.admin import router as admin_router
from server.api.routes.chat import router as chat_router
from server.api.routes.conversations import router as conversations_router
from server.api.routes.knowledge import router as knowledge_router
from server.core.config import settings


app = FastAPI(
    title="OpsPilot API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "message": "OpsPilot API is running"
    }


app.include_router(knowledge_router)
app.include_router(chat_router)
app.include_router(conversations_router)
app.include_router(admin_router)
