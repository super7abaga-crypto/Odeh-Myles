"""
storage.py — persists team ratings and match-processing history to JSON files.

Unlike the SQLite projects, this data is small and flat, so whole-file
JSON read/write is simpler and more appropriate than a database. Good
rule of thumb: SQLite shines when you need to query/filter/relate rows;
JSON shines for small, whole documents you read and write in one piece.

Two files:
  ratings.json           team name -> rating
  processed_matches.json list of football-data.org match IDs already
                          fed into the Elo engine

Why processed_matches.json exists: backfilling or re-syncing a date
range that overlaps a previous sync would otherwise re-apply the same
finished matches to the ratings a second time, quietly corrupting every
rating downstream. Every match from football-data.org has a unique "id"
field — we use that as the fingerprint to guard against reprocessing.
"""

import json
import os

RATINGS_FILE = "ratings.json"
PROCESSED_MATCHES_FILE = "processed_matches.json"
MATCH_LOG_FILE = "match_log.json"
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


def load_processed_matches() -> set:
    """
    Returns the set of match IDs that have already been applied to the
    ratings. JSON has no native set type, so this is stored on disk as a
    list and converted to a set in memory (sets give O(1) membership
    checks, which matters once you've processed thousands of matches).
    """
    if not os.path.exists(PROCESSED_MATCHES_FILE):
        return set()

    with open(PROCESSED_MATCHES_FILE, "r") as f:
        return set(json.load(f))


def save_processed_matches(processed: set):
    with open(PROCESSED_MATCHES_FILE, "w") as f:
        json.dump(sorted(processed), f, indent=2)


def is_processed(processed: set, match_id: int) -> bool:
    return match_id in processed


def mark_processed(processed: set, match_id: int):
    """Adds a match ID to the in-memory set. Caller still has to call
    save_processed_matches() afterward to persist it."""
    processed.add(match_id)


def load_match_log() -> list:
    """
    Returns every finished match that's been applied to the ratings, as a
    list of records in chronological order. This is the source of truth
    for anything that needs *history* rather than just the current
    numbers — rating trend charts, head-to-head records, and eventually
    prediction accuracy scoring all read from this instead of ratings.json,
    which only ever holds the latest value.
    """
    if not os.path.exists(MATCH_LOG_FILE):
        return []

    with open(MATCH_LOG_FILE, "r") as f:
        return json.load(f)


def save_match_log(log: list):
    with open(MATCH_LOG_FILE, "w") as f:
        json.dump(log, f, indent=2)


def append_match_record(log: list, record: dict):
    """Adds one match record to the in-memory log. Caller still has to
    call save_match_log() afterward to persist it."""
    log.append(record)