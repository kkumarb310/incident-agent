import json
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

EMBED_FN = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

def get_collection():
    # PersistentClient saves to disk — data survives restarts
    client = chromadb.PersistentClient(path="./chroma_data")
    return client.get_or_create_collection(
        name="incidents",
        embedding_function=EMBED_FN
    )

def ingest():
    collection = get_collection()

    with open("data/incidents.json") as f:
        incidents = json.load(f)

    # upsert = insert or update if already exists
    collection.upsert(
        ids=[i["id"] for i in incidents],
        documents=[
            f"{i['title']}. {i['description']} Resolution: {i['resolution']}"
            for i in incidents
        ],
        metadatas=[
            {"severity": i["severity"], "title": i["title"]}
            for i in incidents
        ]
    )

    print(f"Ingested {len(incidents)} incidents")
    print("Saved to ./chroma_data/")

if __name__ == "__main__":
    ingest()