"""
main.py — Football Predictor Dashboard API.

This file adds NO new prediction logic of its own — it's a thin web layer
on top of elo.py, storage.py, and live_data.py, unchanged from the CLI
version. This is a deliberate architecture choice: the core logic doesn't
care whether it's being driven by a CLI or a web API, so we reuse it as-is
rather than duplicating or rewriting it.
"""

import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from elo import match_probabilities
from storage import load_ratings, get_rating
from live_data import fetch_matches, parse_result, get_team_names, DEFAULT_COMPETITION

app = FastAPI(title="Football Predictor Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _get_api_key() -> Optional[str]:
    return os.environ.get("FOOTBALL_DATA_API_KEY")


class TeamRating(BaseModel):
    team: str
    rating: float


class PredictionResponse(BaseModel):
    home_team: str
    away_team: str
    home_rating: float
    away_rating: float
    home_win: float
    draw: float
    away_win: float


@app.get("/teams", response_model=list[TeamRating])
def list_teams():
    """All teams currently in ratings.json, sorted strongest to weakest."""
    ratings = load_ratings()
    sorted_teams = sorted(ratings.items(), key=lambda kv: kv[1], reverse=True)
    return [TeamRating(team=team, rating=rating) for team, rating in sorted_teams]


@app.get("/predict", response_model=PredictionResponse)
def predict(home_team: str = Query(...), away_team: str = Query(...)):
    ratings = load_ratings()
    home_rating = get_rating(ratings, home_team)
    away_rating = get_rating(ratings, away_team)
    probs = match_probabilities(home_rating, away_rating)

    return PredictionResponse(
        home_team=home_team,
        away_team=away_team,
        home_rating=home_rating,
        away_rating=away_rating,
        home_win=probs["home_win"],
        draw=probs["draw"],
        away_win=probs["away_win"],
    )


@app.get("/upcoming", response_model=list[PredictionResponse])
def upcoming(
    date_from: str = Query(..., description="YYYY-MM-DD"),
    date_to: str = Query(..., description="YYYY-MM-DD"),
    competition: str = Query(DEFAULT_COMPETITION),
):
    api_key = _get_api_key()
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Server is missing FOOTBALL_DATA_API_KEY. Set it as an environment variable before starting uvicorn.",
        )

    try:
        matches = fetch_matches(api_key, competition, date_from=date_from, date_to=date_to)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Couldn't fetch live data: {e}")

    ratings = load_ratings()
    scheduled = [m for m in matches if parse_result(m) is None]

    results = []
    for match in scheduled:
        home_team, away_team = get_team_names(match)
        home_rating = get_rating(ratings, home_team)
        away_rating = get_rating(ratings, away_team)
        probs = match_probabilities(home_rating, away_rating)

        results.append(PredictionResponse(
            home_team=home_team,
            away_team=away_team,
            home_rating=home_rating,
            away_rating=away_rating,
            home_win=probs["home_win"],
            draw=probs["draw"],
            away_win=probs["away_win"],
        ))

    return results
