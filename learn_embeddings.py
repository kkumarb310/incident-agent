from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

# Convert 3 sentences into number arrays
e1 = model.encode("database connection pool exhausted")
e2 = model.encode("postgres connections maxed out")
e3 = model.encode("SSL certificate expired")

print("Each sentence becomes", e1.shape[0], "numbers")
print("First 5 numbers of e1:", e1[:5])

# Measure how similar two sentences are
from numpy import dot
from numpy.linalg import norm

def similarity(a, b):
    return dot(a, b) / (norm(a) * norm(b))

print("\nSimilarity scores (1.0 = identical, 0.0 = nothing in common):")
print(f"DB sentence vs DB sentence:  {similarity(e1, e2):.3f}")
print(f"DB sentence vs SSL sentence: {similarity(e1, e3):.3f}")