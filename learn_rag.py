from app.rag.retrieval import retrieve_similar

query = "application throwing database timeout errors, connections refused"

print("Query:", query)
print("\nTop 3 similar past incidents:\n")

results = retrieve_similar(query, k=3)
for i, doc in enumerate(results, 1):
    print(f"Result {i}:")
    print(doc[:200])
    print()