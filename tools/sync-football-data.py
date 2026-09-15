#!/usr/bin/env python3
"""Import LaLiga into private SQLite and export the public website snapshot.
Only the synchronizer contacts football-data.org; no API key reaches the browser.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import sqlite3
import tempfile
import time
import unicodedata
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://api.football-data.org/v4/competitions/PD'
STATUS = {'SCHEDULED': 'proximo', 'TIMED': 'proximo', 'IN_PLAY': 'en_directo',
          'PAUSED': 'en_directo', 'FINISHED': 'finalizado', 'POSTPONED': 'aplazado',
          'SUSPENDED': 'suspendido', 'CANCELLED': 'cancelado', 'AWARDED': 'finalizado'}
# Stable identifiers used by existing URLs and editorial sheets.
TEAM_IDS = {77: 'athletic-club', 78: 'atletico-de-madrid', 79: 'ca-osasuna',
    80: 'rcd-espanyol', 81: 'fc-barcelona', 82: 'getafe-cf', 83: 'granada-cf',
    86: 'real-madrid', 87: 'rayo-vallecano', 88: 'levante-ud', 5335: 'racing-club',
    90: 'real-betis', 92: 'real-sociedad', 94: 'villarreal-cf', 95: 'valencia-cf',
    558: 'celta', 559: 'sevilla-fc', 263: 'deportivo-alaves', 285: 'elche-cf',
    84: 'malaga-cf', 560: 'rc-deportivo'}


def slug(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', value).strip('-')


def fetch(endpoint, token):
    req = urllib.request.Request(BASE + endpoint, headers={'X-Auth-Token': token})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Never print request headers or provider response bodies (may include secrets).
        raise RuntimeError(f'football-data.org: HTTP {error.code}; se conserva la última copia. Revisa el token, plan o cupo.') from None
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise RuntimeError('No se pudo descargar un JSON válido; se conserva la última copia.') from None


def validate(fixtures, teams, standings):
    matches = fixtures.get('matches')
    roster = teams.get('teams')
    tables = standings.get('standings')
    if not isinstance(matches, list) or not matches or not isinstance(roster, list) or not roster:
        raise ValueError('Calendario o equipos vacíos: no se sustituye la copia existente.')
    if not isinstance(tables, list) or not any(t.get('type') == 'TOTAL' and t.get('table') for t in tables):
        raise ValueError('Clasificación no válida: no se sustituye la copia existente.')
    ids = {t['id'] for t in roster}
    seen = set()
    seasons = set()
    for match in matches:
        if match.get('id') in seen or not isinstance(match.get('id'), int):
            raise ValueError('Identificadores de partidos inválidos o duplicados.')
        seen.add(match['id'])
        seasons.add(match['season']['id'])
        if match['homeTeam']['id'] not in ids or match['awayTeam']['id'] not in ids:
            raise ValueError('El partido referencia un equipo desconocido.')
        dt.datetime.fromisoformat(match['utcDate'].replace('Z', '+00:00'))
        if match.get('status') not in STATUS:
            raise ValueError('Estado de partido desconocido.')
    if len(seasons) != 1 or teams['season']['id'] not in seasons or standings['season']['id'] not in seasons:
        raise ValueError('Las respuestas no pertenecen a la misma temporada.')


def convert(fixtures, roster, standings, previous, updated):
    from zoneinfo import ZoneInfo
    validate(fixtures, roster, standings)
    season = fixtures['matches'][0]['season']
    year = int(season['startDate'][:4])
    season_id = f'laliga-{year}-{year + 1}'
    old_teams = {t['id']: t for t in previous.get('teams', [])}
    old_by_provider = {t.get('footballDataId'): t for t in previous.get('teams', []) if t.get('footballDataId')}
    total_table = next(t['table'] for t in standings['standings'] if t['type'] == 'TOTAL')
    ranking = {row['team']['id']: row for row in total_table}
    teams = []
    mapping = {}
    for item in roster['teams']:
        stable_id = old_by_provider.get(item['id'], {}).get('id') or TEAM_IDS.get(item['id']) or f"fd-team-{item['id']}"
        old = old_teams.get(stable_id, {})
        row = ranking.get(item['id'], {})
        mapping[item['id']] = stable_id
        teams.append({**old, 'id': stable_id, 'slug': old.get('slug', stable_id),
            'footballDataId': item['id'], 'name': old.get('name') or item.get('shortName') or item['name'],
            'crest': item.get('crest'), 'venue': item.get('venue'), 'standing': row.get('position'),
            'form': [], 'stats': {key: row.get(key) for key in
                ('playedGames', 'won', 'draw', 'lost', 'points', 'goalsFor', 'goalsAgainst', 'goalDifference')}})
    if len(mapping) != len(set(mapping.values())):
        raise ValueError('Dos equipos comparten el mismo identificador interno.')
    by_id = {t['id']: t for t in teams}
    old_matches = previous.get('matches', []) if previous.get('season', {}).get('id') == season_id else []
    by_provider = {m.get('footballDataId'): m for m in old_matches if m.get('footballDataId')}
    by_pair = {(m['homeTeamId'], m['awayTeamId']): m for m in old_matches}
    matches = []
    rounds = {}
    for item in fixtures['matches']:
        home, away = mapping[item['homeTeam']['id']], mapping[item['awayTeam']['id']]
        old = by_provider.get(item['id']) or by_pair.get((home, away), {})
        date = dt.datetime.fromisoformat(item['utcDate'].replace('Z', '+00:00'))
        local = date.astimezone(ZoneInfo('Europe/Madrid'))
        round_number = item.get('matchday')
        round_id = f'{season_id}-jornada-{round_number or "pendiente"}'
        rounds[round_id] = {'id': round_id, 'name': f'Jornada {round_number or "pendiente"}',
                            'slug': f'jornada-{round_number or "pendiente"}'}
        scores = item.get('score', {}).get('fullTime', {})
        score = {side: scores.get(side) for side in ('home', 'away')}
        if any(type(value) is not int or value < 0 for value in score.values()):
            score = None
        match = {**old, 'id': old.get('id') or f"fd-match-{item['id']}",
            'slug': old.get('slug') or f"{home}-{away}-{local.date()}", 'footballDataId': item['id'],
            'competitionId': 'laliga', 'seasonId': season_id, 'roundId': round_id,
            'homeTeamId': home, 'awayTeamId': away, 'startDate': item['utcDate'],
            'localDate': str(local.date()), 'localTime': local.strftime('%H:%M'),
            'timeStatus': 'pending' if item['status'] == 'SCHEDULED' else 'confirmed',
            'status': STATUS[item['status']], 'score': score,
            'venue': item.get('venue') or by_id[home].get('venue'),
            'referee': ', '.join(r['name'] for r in item.get('referees', []) if r.get('name')) or None,
            'refereeId': ('fd-ref-' + str(item['referees'][0]['id'])) if item.get('referees') and item['referees'][0].get('id') else None,
            'lastUpdated': item.get('lastUpdated') or updated,
            'source': 'football-data.org', 'quality': old.get('quality', 'data_only'),
            'robots': old.get('robots', 'noindex')}
        matches.append(match)
    if len(matches) < len(old_matches):
        raise ValueError('El calendario recibido está incompleto; se conserva la copia anterior.')
    for team in teams:
        results = sorted((m for m in matches if m['status'] == 'finalizado' and m['score'] and
            team['id'] in (m['homeTeamId'], m['awayTeamId'])), key=lambda m: m['startDate'])
        form = []
        for match in results:
            a, b = match['score']['home'], match['score']['away']
            if match['awayTeamId'] == team['id']:
                a, b = b, a
            form.append('E' if a == b else 'V' if a > b else 'D')
        team['form'] = form[-5:]
        for scope in ('home', 'away'):
            rows = [m for m in results if m[f'{scope}TeamId'] == team['id']]
            opposite = 'away' if scope == 'home' else 'home'
            gf = sum(m['score'][scope] for m in rows)
            ga = sum(m['score'][opposite] for m in rows)
            team['stats'][scope] = {'played': len(rows), 'goalsFor': gf, 'goalsAgainst': ga,
                'averageGoalsFor': round(gf / len(rows), 2) if rows else None,
                'averageGoalsAgainst': round(ga / len(rows), 2) if rows else None}
    return {'competition': {'id': 'laliga', 'slug': 'laliga', 'name': 'LaLiga EA Sports', 'country': 'España'},
        'season': {'id': season_id, 'name': f'{year}/{year + 1}', 'footballDataId': season['id']},
        'lastUpdated': updated, 'source': {'name': 'football-data.org', 'url': 'https://www.football-data.org',
        'delayed': True}, 'teams': teams, 'rounds': list(rounds.values()), 'matches': matches}


def save(db, snapshot, raw):
    db.executescript('''CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY CHECK(id=1), updated TEXT, payload TEXT);
        CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY, payload TEXT);
        CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY, season TEXT, payload TEXT);
        CREATE TABLE IF NOT EXISTS responses (endpoint TEXT PRIMARY KEY, payload TEXT);''')
    with db:
        for team in snapshot['teams']:
            db.execute('INSERT OR REPLACE INTO teams VALUES (?, ?)', (team['footballDataId'], json.dumps(team)))
        # Keep other seasons, replace the complete current-season set atomically.
        db.execute('DELETE FROM matches WHERE season=?', (snapshot['season']['id'],))
        db.executemany('INSERT OR REPLACE INTO matches VALUES (?, ?, ?)',
            [(m['footballDataId'], m['seasonId'], json.dumps(m)) for m in snapshot['matches']])
        for endpoint, payload in raw.items():
            db.execute('INSERT OR REPLACE INTO responses VALUES (?, ?)', (endpoint, json.dumps(payload)))
        db.execute('INSERT OR REPLACE INTO snapshots VALUES (1, ?, ?)',
                   (snapshot['lastUpdated'], json.dumps(snapshot, ensure_ascii=False)))


def export(snapshot, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', dir=destination.parent, delete=False, encoding='utf-8') as tmp:
        json.dump(snapshot, tmp, ensure_ascii=False, indent=2)
        tmp.write('\n')
    os.replace(tmp.name, destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', required=True, type=Path, help='Private SQLite path OUTSIDE the public repository')
    parser.add_argument('--output', type=Path, default=ROOT / 'data/prepartido/laliga.json')
    parser.add_argument('--force', action='store_true', help='Ignore the six-hour freshness check')
    args = parser.parse_args()
    if args.db.resolve().is_relative_to(ROOT):
        parser.error('La base SQLite debe estar fuera del repositorio público.')
    args.db.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Lock across freshness check, all requests and commit: concurrent runs spend no extra quota.
    import fcntl
    with open(str(args.db) + '.lock', 'w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError('Ya hay una sincronización en marcha.') from None
        with sqlite3.connect(args.db) as db:
            db.execute('CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY CHECK(id=1), updated TEXT, payload TEXT)')
            cached = db.execute('SELECT updated, payload FROM snapshots WHERE id=1').fetchone()
            now = dt.datetime.now(dt.timezone.utc)
            if cached and not args.force and (now - dt.datetime.fromisoformat(cached[0])).total_seconds() < 21600:
                export(json.loads(cached[1]), args.output)
                print('Copia vigente: 0 consultas a la API.')
                return
            token = os.environ.get('FOOTBALL_DATA_TOKEN', '').strip()
            if not token:
                raise RuntimeError('Falta el secreto FOOTBALL_DATA_TOKEN.')
            fixtures = fetch('/matches', token)
            year = fixtures.get('matches', [{}])[0].get('season', {}).get('startDate', '')[:4] if fixtures.get('matches') else ''
            if not re.fullmatch(r'\d{4}', year):
                raise ValueError('Temporada inválida o calendario vacío.')
            # Three calls per run, paced below the free tier limit; no automatic retries.
            time.sleep(6.1)
            teams = fetch('/teams?season=' + year, token)
            time.sleep(6.1)
            standings = fetch('/standings?season=' + year, token)
            previous = json.loads(args.output.read_text()) if args.output.exists() else {}
            snapshot = convert(fixtures, teams, standings, previous, now.isoformat())
            save(db, snapshot, {'matches': fixtures, 'teams': teams, 'standings': standings})
            export(snapshot, args.output)
            print(f"Sincronizados {len(snapshot['matches'])} partidos y {len(snapshot['teams'])} equipos; 3 consultas.")
    os.chmod(args.db, 0o600)


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, ValueError, KeyError, OSError, sqlite3.Error) as error:
        raise SystemExit(str(error))
