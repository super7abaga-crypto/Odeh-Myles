"""
main.py — Football Predictor Dashboard API.

This file adds NO new prediction logic of its own — it's a thin web layer
on top of elo.py, storage.py, and live_data.py, unchanged from the CLI
version. This is a deliberate architecture choice: the core logic doesn't
care whether it's being driven by a CLI or a web API, so we reuse it as-is
rather than duplicating or rewriting it.

/history and /head-to-head both read from match_log.json (written by the
CLI's sync/backfill commands) rather than ratings.json, since ratings.json
only ever holds each team's *current* number — match_log.json is the only
place a rating's history over time actually lives.
"""

import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from elo import match_probabilities
from storage import load_ratings, get_rating, load_match_log
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


class HistoryPoint(BaseModel):
    date: str
    rating: float


class Meeting(BaseModel):
    date: str
    competition: str
    home_team: str
    away_team: str
    result: str


class HeadToHeadResponse(BaseModel):
    meetings: list[Meeting]
    current_prediction: PredictionResponse


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


@app.get("/history/{team}", response_model=list[HistoryPoint])
def team_history(team: str):
    """
    A team's rating after every match it's played, in chronological order
    — the data behind the rating-trend chart. Returns an empty list for a
    team with no logged matches yet (e.g. one only ever seen via /predict,
    never through a synced result).
    """
    log = load_match_log()
    points = []

    for record in log:
        if record["home_team"] == team:
            points.append(HistoryPoint(date=record["date"], rating=record["home_rating_after"]))
        elif record["away_team"] == team:
            points.append(HistoryPoint(date=record["date"], rating=record["away_rating_after"]))

    points.sort(key=lambda p: p.date)
    return points


@app.get("/head-to-head", response_model=HeadToHeadResponse)
def head_to_head(team_a: str = Query(...), team_b: str = Query(...)):
    """
    Every logged past meeting between two teams, plus today's prediction
    for them using current ratings. Order in the query doesn't matter —
    a match is a meeting between these two teams regardless of who was
    home in it.
    """
    log = load_match_log()
    pair = {team_a, team_b}

    meetings = [
        Meeting(
            date=record["date"],
            competition=record["competition"],
            home_team=record["home_team"],
            away_team=record["away_team"],
            result=record["result"],
        )
        for record in log
        if {record["home_team"], record["away_team"]} == pair
    ]
    meetings.sort(key=lambda m: m.date)

    ratings = load_ratings()
    home_rating = get_rating(ratings, team_a)
    away_rating = get_rating(ratings, team_b)
    probs = match_probabilities(home_rating, away_rating)

    current_prediction = PredictionResponse(
        home_team=team_a,
        away_team=team_b,
        home_rating=home_rating,
        away_rating=away_rating,
        home_win=probs["home_win"],
        draw=probs["draw"],
        away_win=probs["away_win"],
    )

    return HeadToHeadResponse(meetings=meetings, current_prediction=current_prediction)