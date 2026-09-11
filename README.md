# Football Predictor Dashboard

A web dashboard for the Elo-based football predictor — reuses `elo.py`,
`storage.py`, and `live_data.py` completely unchanged from the CLI
version, with a new FastAPI layer and browser frontend on top.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Copy your existing `ratings.json` (from your `football_predictor` CLI
project) into this `backend/` folder, so the dashboard starts with your
real, already-earned ratings instead of an empty file.

Set your football-data.org API key as an environment variable (needed
for the "Upcoming fixtures" tab):
```bash
export FOOTBALL_DATA_API_KEY=your_key_here
```

Run the backend:
```bash
uvicorn main:app --reload
```

Open `frontend/index.html` in your browser.

## Features

- **Predict a match** — pick any two teams from dropdowns (populated from
  your real ratings), see win/draw/loss probabilities as bar charts.
- **Team ratings** — a full sortable table of every team's current rating.
- **Upcoming fixtures** — pick a competition and date range, see every
  scheduled (not-yet-played) match automatically predicted — the same
  logic as the CLI's `upcoming` command, exposed as a web endpoint.

## Architecture

This project's whole point is reuse: `elo.py` (the math), `storage.py`
(JSON persistence), and `live_data.py` (the football-data.org connector)
are copied unchanged from the CLI project. `backend/main.py` is the only
new code on the backend — it's a thin FastAPI layer that calls the exact
same functions the CLI commands call, just returning JSON over HTTP
instead of printing to a terminal. This is a common real-world pattern:
separating core logic from the interface (CLI vs. web) that drives it.

## Requirements

Python 3, a browser, a free football-data.org API key for live fixtures.
