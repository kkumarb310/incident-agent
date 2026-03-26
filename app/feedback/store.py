from app.database.operations import (
    insert_feedback,
    get_all_feedback,
    get_all_flagged
)

def save_feedback(entry: dict) -> dict:
    return insert_feedback(entry)

def load_feedback() -> list[dict]:
    return get_all_feedback()

def load_flagged() -> list[dict]:
    return get_all_flagged()