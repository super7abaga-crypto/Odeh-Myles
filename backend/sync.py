"""
main.py — Football Predictor CLI.

Two commands:
  backfill   sync a whole date range across all 5 leagues, in chronological
             order, to build up ratings from real historical results
  sync       sync a single day (defaults to today) across all 5 leagues,
             for keeping ratings current

Both commands share one code path (_sync_range), so there's only one
place the de-dup / rating-update logic can go wrong, not two.
"""

import argparse
import os
from datetime import date

from elo import update_ratings
from live_data import fetch_matches, parse_result, get_team_names
from storage import (
    load_ratings, save_ratings, get_rating,
    load_processed_matches, save_processed_matches,
    is_processed, mark_processed,
    load_match_log, save_match_log, append_match_record,
)

LEAGUES = ["PL", "PD", "BL1", "SA", "FL1"]


def _get_api_key() -> str:
    api_key = os.environ.get("FOOTBALL_DATA_API_KEY")
    if not api_key:
        raise SystemExit(
            "Missing FOOTBALL_DATA_API_KEY. Set it as an environment "
            "variable before running this script."
        )
    return api_key


def _sync_range(date_from: str, date_to: str, leagues: list[str]):
    """
    Fetches matches for each league in the date range, applies any
    finished match not already processed, and saves after each league.

    Saving after each league (rather than only at the very end) means a
    crash or an API rate-limit error partway through doesn't throw away
    progress already made on earlier leagues.
    """
    api_key = _get_api_key()
    ratings = load_ratings()
    processed = load_processed_matches()
    match_log = load_match_log()

    total_applied = 0
    total_skipped = 0

    for league in leagues:
        print(f"\nFetching {league} matches from {date_from} to {date_to}...")
        try:
            matches = fetch_matches(api_key, league, date_from=date_from, date_to=date_to)
        except Exception as e:
            print(f"  Couldn't fetch {league}: {e}")
            continue

        applied_this_league = 0

        for match in matches:
            match_id = match["id"]
            result = parse_result(match)

            if result is None:
                # Not finished yet (scheduled/postponed/in-play) — nothing
                # to apply. Nothing to skip-count either; it was never a
                # candidate for processing.
                continue

            if is_processed(processed, match_id):
                total_skipped += 1
                continue

            home_team, away_team = get_team_names(match)
            home_rating = get_rating(ratings, home_team)
            away_rating = get_rating(ratings, away_team)

            new_home, new_away = update_ratings(home_rating, away_rating, result)
            ratings[home_team] = new_home
            ratings[away_team] = new_away

            append_match_record(match_log, {
                "match_id": match_id,
                "date": match.get("utcDate", "")[:10],
                "competition": league,
                "home_team": home_team,
                "away_team": away_team,
                "result": result,
                "home_rating_after": new_home,
                "away_rating_after": new_away,
            })

            mark_processed(processed, match_id)
            applied_this_league += 1
            total_applied += 1

        print(f"  Applied {applied_this_league} new result(s).")

        # Save after every league, not just at the end — see docstring.
        save_ratings(ratings)
        save_processed_matches(processed)
        save_match_log(match_log)

    print(f"\nDone. {total_applied} match(es) applied, {total_skipped} already-processed match(es) skipped.")


def backfill(args):
    _sync_range(args.date_from, args.date_to, leagues=[args.competition] if args.competition else LEAGUES)


def sync(args):
    day = args.date or date.today().isoformat()
    _sync_range(day, day, leagues=[args.competition] if args.competition else LEAGUES)


def main():
    parser = argparse.ArgumentParser(description="Football Predictor CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    backfill_parser = subparsers.add_parser("backfill", help="Sync a date range of historical results")
    backfill_parser.add_argument("--from", dest="date_from", required=True, help="YYYY-MM-DD")
    backfill_parser.add_argument("--to", dest="date_to", required=True, help="YYYY-MM-DD")
    backfill_parser.add_argument("--competition", help="Single competition code (e.g. PL). Defaults to all 5.")
    backfill_parser.set_defaults(func=backfill)

    sync_parser = subparsers.add_parser("sync", help="Sync a single day (defaults to today)")
    sync_parser.add_argument("--date", help="YYYY-MM-DD. Defaults to today.")
    sync_parser.add_argument("--competition", help="Single competition code (e.g. PL). Defaults to all 5.")
    sync_parser.set_defaults(func=sync)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()