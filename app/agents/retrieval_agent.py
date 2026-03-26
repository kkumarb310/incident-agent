from app.rag.retrieval import retrieve_similar

def run(incident_description: str) -> dict:
    """
    Takes an incident description.
    Returns similar past incidents as context.
    """
    print("[Retrieval Agent] Searching for similar incidents...")

    similar = retrieve_similar(incident_description, k=3)

    print(f"[Retrieval Agent] Found {len(similar)} similar incidents")

    return {
        "similar_incidents": similar,
        "count": len(similar)
    }