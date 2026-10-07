from sentence_transformers import SentenceTransformer


MODEL_NAME = "all-MiniLM-L6-v2"

_embedding_model = SentenceTransformer(MODEL_NAME)


def generate_embedding(text: str) -> list[float]:
    embedding = _embedding_model.encode(
        text,
        normalize_embeddings=True,
    )

    return embedding.tolist()


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    embeddings = _embedding_model.encode(
        texts,
        normalize_embeddings=True,
    )

    return embeddings.tolist()