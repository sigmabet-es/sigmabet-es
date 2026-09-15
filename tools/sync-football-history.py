#!/usr/bin/env python3
"""Free historical LaLiga results and core match statistics."""
import argparse
import copy
import csv
import datetime as dt
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import sqlite3
import time
import urllib.request
from zoneinfo import ZoneInfo

spec = importlib.util.spec_from_file_location('calendar_sync', Path(__file__).with_name('sync-football-data.py'))
calendar = importlib.util.module_from_spec(spec)
spec.loader.exec_module(calendar)
ROOT = calendar.ROOT
EXTRA = {89: 'external-mallorca', 298: 'external-girona', 1048: 'external-real-oviedo',
         250: 'real-valladolid', 275: 'ud-las-palmas', 745: 'cd-leganes'}
CSV_IDS = dict(zip(
    ['Alaves','Ath Bilbao','Ath Madrid','Barcelona','Betis','Celta','Espanol','Getafe','Girona','Las Palmas',
     'Leganes','Mallorca','Osasuna','Real Madrid','Sevilla','Sociedad','Valencia','Valladolid','Vallecano',
     'Villarreal','Elche','Levante','Oviedo','La Coruna','Malaga','Santander'],
    ['deportivo-alaves','athletic-club','atletico-de-madrid','fc-barcelona','real-betis','celta','rcd-espanyol',
     'getafe-cf','external-girona','ud-las-palmas','cd-leganes','external-mallorca','ca-osasuna','real-madrid',
     'sevilla-fc','real-sociedad','valencia-cf','real-valladolid','rayo-vallecano','villarreal-cf','elche-cf',
     'levante-ud','external-real-oviedo','rc-deportivo','malaga-cf','racing-club']))
CSV_STATS = {'firstHalfGoals':('HTHG','HTAG'),'shots':('HS','AS'),'shotsOnTarget':('HST','AST'),
    'corners':('HC','AC'),'yellowCards':('HY','AY'),'redCards':('HR','AR'),'fouls':('HF','AF')}
REQUIRED = ['firstHalfGoals','secondHalfGoals','shots','shotsOnTarget','corners',
            'yellowCards','redCards','fouls']


def number(value):
    if value is None or isinstance(value, bool) or str(value).strip() == '': return None
    try: result = float(str(value).rstrip('%'))
    except (ValueError, TypeError): return None
    return result if math.isfinite(result) else None


def set_stat(match, key, side, value, source, overwrite=False):
    value = number(value)
    values = match.setdefault('stats', {}).setdefault(key, {'home':None,'away':None})
    if value is None: return
    if values.get(side) is not None and not overwrite: return
    values[side] = value
    match.setdefault('statSources', {}).setdefault(key, {})[side] = source


def derive_second_half(match):
    for side in ('home','away'):
        full = number((match.get('score') or {}).get(side))
        half = number(match.get('stats',{}).get('firstHalfGoals',{}).get(side))
        if full is not None and half is not None and 0 <= half <= full:
            set_stat(match,'secondHalfGoals',side,full-half,'derived: fullTime - halfTime',True)


def read_cache(db, key):
    row = db.execute('SELECT payload FROM history_sources WHERE key=?',(key,)).fetchone()
    return json.loads(row[0]) if row else None


def write_cache(db, key, payload):
    with db:
        db.execute('INSERT OR REPLACE INTO history_sources VALUES (?,?,?)',
                   (key,dt.datetime.now(dt.timezone.utc).isoformat(),json.dumps(payload)))


def download(url, token=None, provider='org', csv_file=False):
    headers = {} if not token else {('X-Auth-Token' if provider=='org' else 'x-apisports-key'):token}
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=30) as response:
        raw = response.read().decode('utf-8-sig')
    data = list(csv.DictReader(io.StringIO(raw))) if csv_file else json.loads(raw)
    if isinstance(data,dict) and data.get('errors'): raise ValueError('El proveedor no permite la consulta o no tiene datos.')
    return data


def load_source(db, key, url, token, offline, current=False, csv_file=False):
    saved = read_cache(db,key)
    stamp = db.execute('SELECT updated FROM history_sources WHERE key=?',(key,)).fetchone()
    fresh = stamp and (dt.datetime.now(dt.timezone.utc)-dt.datetime.fromisoformat(stamp[0])).total_seconds()<21600
    if saved is not None and (not current or fresh or offline): return saved
    if offline: raise ValueError('No hay copia local de '+key)
    if not token and not csv_file: raise ValueError('Falta el token para '+key)
    payload=download(url,token,csv_file=csv_file)
    if not payload or (isinstance(payload,dict) and not payload.get('matches')):
        raise ValueError('Respuesta vacía para '+key)
    write_cache(db,key,payload)
    time.sleep(6.2)
    return payload


def assemble(current, historical):
    teams={t['id']:copy.deepcopy(t) for t in current['teams']}
    matches=[]
    for data in historical:
        for row in data['matches']:
            if row['competition']['code'] != 'PD': raise ValueError('Competición inesperada')
            year=int(row['season']['startDate'][:4])
            if year<2024: continue
            mapped=[]
            for team in (row['homeTeam'],row['awayTeam']):
                identifier=calendar.TEAM_IDS.get(team['id']) or EXTRA.get(team['id'])
                if not identifier: raise ValueError('Equipo sin correspondencia: '+team['name'])
                mapped.append(identifier)
                if identifier not in teams:
                    teams[identifier]={'id':identifier,'slug':identifier,'name':team.get('shortName') or team['name'],
                        'crest':team.get('crest'),'footballDataId':team['id']}
            score={side:(row.get('score',{}).get('fullTime') or {}).get(side) for side in ('home','away')}
            if any(number(v) is None for v in score.values()): score=None
            referee=next((r for r in row.get('referees',[]) if r.get('type')=='REFEREE'),None)
            if not referee and row.get('referees'):referee=row['referees'][0]
            local=dt.datetime.fromisoformat(row['utcDate'].replace('Z','+00:00')).astimezone(ZoneInfo('Europe/Madrid'))
            match={'id':f"fd-match-{row['id']}",'footballDataId':row['id'],'slug':None,
                'competitionId':'laliga','seasonId':f'laliga-{year}-{year+1}',
                'roundId':f'laliga-{year}-{year+1}-jornada-{row["matchday"]}',
                'homeTeamId':mapped[0],'awayTeamId':mapped[1],'startDate':row['utcDate'],'localDate':str(local.date()),
                'timeStatus':'confirmed','status':calendar.STATUS[row['status']], 'score':score,
                'referee':referee.get('name') if referee else None,'refereeId':f"fd-ref-{referee['id']}" if referee and referee.get('id') else None,
                'venue':row.get('venue'),'stats':{},'statSources':{},'source':'football-data.org'}
            for side in ('home','away'):
                set_stat(match,'firstHalfGoals',side,(row.get('score',{}).get('halfTime') or {}).get(side),'football-data.org')
            derive_second_half(match)
            matches.append(match)
    matches.extend(copy.deepcopy(current['matches']))
    # Current matches get official referee IDs and half-time scores from saved calendar responses later.
    return teams,matches


def merge_csv(matches, rows, year):
    lookup={(m['homeTeamId'],m['awayTeamId']):m for m in matches if m['seasonId']==f'laliga-{year}-{year+1}'}
    used=set()
    for row in rows:
        if not row.get('HomeTeam'):continue
        home,away=CSV_IDS.get(row['HomeTeam']),CSV_IDS.get(row['AwayTeam'])
        match=lookup.get((home,away))
        if not match:raise ValueError(f"Encuentro CSV sin correspondencia: {row['HomeTeam']} / {row['AwayTeam']}")
        if match['id'] in used:raise ValueError('Partido duplicado en CSV')
        used.add(match['id'])
        if match['status']!='finalizado':continue
        score=match.get('score') or {}
        if number(row.get('FTHG'))!=score.get('home') or number(row.get('FTAG'))!=score.get('away'):
            match.setdefault('dataConflicts',[]).append('football-data.co.uk: resultado distinto; estadísticas no mezcladas')
            continue
        for key,columns in CSV_STATS.items():
            for side,column in zip(('home','away'),columns):set_stat(match,key,side,row.get(column),'football-data.co.uk')
        derive_second_half(match)


def aggregates(matches):
    refs={};teams={};coverage={}
    for match in matches:
        if match['status']!='finalizado' or not match.get('score'):continue
        season=match['seasonId'];cov=coverage.setdefault(season,{'finished':0,'referee':0,'venue':0,'stats':{k:0 for k in REQUIRED}})
        cov['finished']+=1
        cov['referee']+=bool(match.get('referee'));cov['venue']+=bool(match.get('venue'))
        for key in REQUIRED:
            pair=match.get('stats',{}).get(key,{})
            cov['stats'][key]+=all(number(pair.get(side)) is not None for side in ('home','away'))
        referee=match.get('referee')
        if referee:
            identifier=match.get('refereeId') or 'name:'+calendar.slug(referee)
            ref=refs.setdefault(identifier,{'id':identifier,'name':referee,'matches':0,
                'yellowCards':{'total':0,'matchesWithData':0},'redCards':{'total':0,'matchesWithData':0}})
            ref['matches']+=1
            for key in ('yellowCards','redCards'):
                pair=match.get('stats',{}).get(key,{})
                if all(number(pair.get(side)) is not None for side in ('home','away')):
                    ref[key]['total']+=pair['home']+pair['away'];ref[key]['matchesWithData']+=1
        for side in ('home','away'):
            team=teams.setdefault((season,match[side+'TeamId']),{'teamId':match[side+'TeamId'],'seasonId':season,'matches':0,'stats':{}})
            team['matches']+=1
            for key in REQUIRED+['goals']:
                value=number(match['score'][side] if key=='goals' else match.get('stats',{}).get(key,{}).get(side))
                field=team['stats'].setdefault(key,{'total':0,'matchesWithData':0})
                if value is not None:field['total']+=value;field['matchesWithData']+=1
    for ref in refs.values():
        for key in ('yellowCards','redCards'):
            r=ref[key];r['average']=round(r['total']/r['matchesWithData'],3) if r['matchesWithData'] else None
    for team in teams.values():
        for field in team['stats'].values():field['average']=round(field['total']/field['matchesWithData'],3) if field['matchesWithData'] else None
    return {'referees':list(refs.values()),'teamSeasons':list(teams.values()),'coverage':coverage}


def persist(db,matches,teams,report):
    with db:
        db.execute('DELETE FROM team_match_statistics')
        for match in matches:
            db.execute('INSERT OR REPLACE INTO matches VALUES (?,?,?)',(match['footballDataId'],match['seasonId'],json.dumps(match)))
            for side in ('home','away'):
                stats={key:pair.get(side) for key,pair in match.get('stats',{}).items()}
                db.execute('INSERT OR REPLACE INTO team_match_statistics VALUES (?,?,?,?)',
                    (match['footballDataId'],match[side+'TeamId'],match['seasonId'],json.dumps(stats)))
        db.execute('DELETE FROM referee_statistics')
        db.executemany('INSERT INTO referee_statistics VALUES (?,?)',[(r['id'],json.dumps(r)) for r in report['referees']])
        db.execute('DELETE FROM team_season_statistics')
        db.executemany('INSERT INTO team_season_statistics VALUES (?,?,?)',[(r['teamId'],r['seasonId'],json.dumps(r)) for r in report['teamSeasons']])
        for team in teams.values():db.execute('INSERT OR REPLACE INTO teams VALUES (?,?)',(team['footballDataId'],json.dumps(team)))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db',type=Path,required=True)
    parser.add_argument('--offline',action='store_true')
    args=parser.parse_args()
    if args.db.resolve().is_relative_to(ROOT):parser.error('La base debe estar fuera del repositorio.')
    import fcntl
    with open(str(args.db)+'.lock','w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        with sqlite3.connect(args.db) as db:
            db.executescript('''CREATE TABLE IF NOT EXISTS history_sources(key TEXT PRIMARY KEY,updated TEXT,payload TEXT);
                CREATE TABLE IF NOT EXISTS team_match_statistics(match_id INTEGER,team_id TEXT,season TEXT,payload TEXT,PRIMARY KEY(match_id,team_id));
                CREATE TABLE IF NOT EXISTS referee_statistics(id TEXT PRIMARY KEY,payload TEXT);
                CREATE TABLE IF NOT EXISTS team_season_statistics(team_id TEXT,season TEXT,payload TEXT,PRIMARY KEY(team_id,season));''')
            current=json.loads((ROOT/'data/prepartido/laliga.json').read_text())
            year=int(current['season']['name'][:4]);token=os.environ.get('FOOTBALL_DATA_TOKEN')
            history=[load_source(db,'org'+str(y),calendar.BASE+'/matches?season='+str(y),token,args.offline) for y in range(2024,year)]
            teams,matches=assemble(current,history)
            raw_current=json.loads(db.execute("SELECT payload FROM responses WHERE endpoint='matches'").fetchone()[0])
            current_by_id={m['id']:m for m in raw_current['matches']}
            for match in matches:
                row=current_by_id.get(match['footballDataId'])
                if not row:continue
                if row.get('referees'):
                    ref=row['referees'][0];match['refereeId']='fd-ref-'+str(ref['id'])
                for side in ('home','away'):set_stat(match,'firstHalfGoals',side,(row.get('score',{}).get('halfTime') or {}).get(side),'football-data.org',True)
                derive_second_half(match)
            for y in range(2024,year+1):
                code=str(y)[2:]+str(y+1)[2:]
                rows=load_source(db,'csv'+code,'https://www.football-data.co.uk/mmz4281/'+code+'/SP1.csv',None,args.offline,current=y==year,csv_file=True)
                merge_csv(matches,rows,y)
            # Retain verified historical metadata already imported, without more API-Football calls.
            saved_path=ROOT/'data/prepartido/history.json'
            saved=json.loads(saved_path.read_text()) if saved_path.exists() else {}
            metadata={m['footballDataId']:m for m in saved.get('matches',[])}
            for match in matches:
                old=metadata.get(match['footballDataId'],{})
                for field in ('venue','venueSource','referee','refereeId'):
                    if not match.get(field) and old.get(field):match[field]=old[field]
                match['stats']={k:v for k,v in match.get('stats',{}).items() if k in REQUIRED}
                match['statSources']={k:v for k,v in match.get('statSources',{}).items() if k in REQUIRED}
            for match in matches:
                for key in REQUIRED:match.setdefault('stats',{}).setdefault(key,{'home':None,'away':None})
            report=aggregates(matches)
            report['updatedAt']=dt.datetime.now(dt.timezone.utc).isoformat()
            report['sources']=['football-data.org','football-data.co.uk']
            report['scope']='core-match-statistics'
            persist(db,matches,teams,report)
            current['matches']=[m for m in matches if m['seasonId']==current['season']['id']]
            calendar.export(current,ROOT/'data/prepartido/laliga.json')
            calendar.export({'updatedAt':report['updatedAt'],'teams':list(teams.values()),
                'matches':[m for m in matches if m['seasonId']!=current['season']['id']]},ROOT/'data/prepartido/history.json')
            calendar.export(report,ROOT/'data/prepartido/coverage.json')
            print(json.dumps({'matches':len(matches),'teams':len(teams),'coverage':report['coverage']}))

if __name__=='__main__':main()
