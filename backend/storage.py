"""
storage.py — persists team ratings to a JSON file.

Unlike the SQLite projects, this data is just one flat dictionary
(team name -> rating), so a whole-file JSON read/write is simpler and
more appropriate than a database. Good rule of thumb: SQLite shines when
you need to query/filter/relate rows; JSON shines for small, whole
documents you read and write in one piece.
"""

import json
import os

RATINGS_FILE = "ratings.json"
DEFAULT_RATING = 1500


def load_ratings() -> dict:
    if not os.path.exists(RATINGS_FILE):
        return {}

    with open(RATINGS_FILE, "r") as f:
        return json.load(f)


def save_ratings(ratings: dict):
    with open(RATINGS_FILE, "w") as f:
        json.dump(ratings, f, indent=2, sort_keys=True)


def get_rating(ratings: dict, team: str) -> float:
    """Returns a team's rating, creating it at the default if it's new."""
    return ratings.get(team, DEFAULT_RATING)
