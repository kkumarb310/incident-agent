from app.database.operations import get_metrics_summary, get_all_audit
import json

print("=== METRICS SUMMARY ===")
summary = get_metrics_summary()
print(json.dumps(summary, indent=2))

print()
print("=== AUDIT ENTRIES ===")
audit = get_all_audit()
print(f"Total entries: {len(audit)}")

if audit:
    print("\nMost recent entry:")
    print(json.dumps(dict(audit[0]), indent=2))
else:
    print("No entries yet — triage an incident first!")