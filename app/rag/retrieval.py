import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

EMBED_FN = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
_client = chromadb.PersistentClient(path="./chroma_data")

def retrieve_similar(query: str, k: int = 3) -> list[str]:
    collection = _client.get_collection(
        name="incidents",
        embedding_function=EMBED_FN
    )
    # query_texts gets converted to embeddings automatically
    # then ChromaDB finds the k most similar stored documents
    results = collection.query(query_texts=[query], n_results=k)
    return results["documents"][0]