from pydantic import BaseModel, Field


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(
        min_length=2,
        max_length=1000,
    )

    top_k: int = Field(
        default=5,
        ge=1,
        le=10,
    )

    similarity_threshold: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
    )


class KnowledgeAskRequest(BaseModel):
    query: str = Field(
        min_length=2,
        max_length=1000,
    )

    top_k: int = Field(
        default=5,
        ge=1,
        le=10,
    )

    similarity_threshold: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
    )