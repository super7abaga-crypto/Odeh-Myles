"""
live_data.py — fetches real Premier League match results from
football-data.org's free API.

football-data.org requires a free API key (unlike TheSportsDB's demo key,
which turned out not to actually include soccer on its free tier). Sign up
at https://www.football-data.org/client/register — no payment needed.

The key is passed via HTTP header, not the URL — that's the standard way
most APIs handle authentication, since headers don't get logged in browser
history or server access logs the way URL parameters can.
"""

import requests

BASE_URL = "https://api.football-data.org/v4"

# All 12 competitions on football-data.org's free tier:
#   PL  = Premier League (England)
#   PD  = La Liga (Spain)
#   BL1 = Bundesliga (Germany)
#   SA  = Serie A (Italy)
#   FL1 = Ligue 1 (France)
#   DED = Eredivisie (Netherlands)
#   PPL = Primeira Liga (Portugal)
#   ELC = Championship (England, 2nd tier)
#   BSA = Brasileirão Série A (Brazil)
#   CL  = UEFA Champions League
#   EC  = UEFA European Championship
#   WC  = FIFA World Cup
DEFAULT_COMPETITION = "PL"


def fetch_matches(api_key: str, competition: str = DEFAULT_COMPETITION,
                   date_from: str | None = None, date_to: str | None = None) -> list[dict]:
    """
    Fetch matches for one competition, optionally within a date range
    (YYYY-MM-DD). If date_to is omitted, it defaults to date_from (a
    single day). If both are omitted, the API returns its own default
    range (roughly the current matchday window).

    Returns a list of raw match dicts, sorted chronologically by kickoff
    time — important for backfilling, since Elo ratings must be updated
    in the order matches actually happened.
    """
    url = f"{BASE_URL}/competitions/{competition}/matches"
    headers = {"X-Auth-Token": api_key}
    params = {}
    if date_from:
        params["dateFrom"] = date_from
        params["dateTo"] = date_to or date_from

    response = requests.get(url, headers=headers, params=params, timeout=10)
    try:
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        # football-data.org includes a specific "message" field explaining
        # *why* the request was rejected (bad date range, plan restriction,
        # etc.) — the default exception text doesn't include it, and
        # without it we're just guessing.
        raise requests.exceptions.HTTPError(f"{e} — API said: {response.text}") from e

    data = response.json()
    matches = data.get("matches", [])
    matches.sort(key=lambda m: m.get("utcDate", ""))
    return matches


def parse_result(match: dict) -> str | None:
    """
    Converts one raw match dict into "home_win" / "draw" / "away_win",
    or None if the match hasn't finished yet.
    """
    if match.get("status") != "FINISHED":
        return None

    score = match.get("score", {}).get("fullTime", {})
    home_score = score.get("home")
    away_score = score.get("away")

    if home_score is None or away_score is None:
        return None

    if home_score > away_score:
        return "home_win"
    elif away_score > home_score:
        return "away_win"
    else:
        return "draw"


def get_team_names(match: dict) -> tuple[str, str]:
    """Returns (home_team_name, away_team_name) from a raw match dict."""
    return match["homeTeam"]["name"], match["awayTeam"]["name"]