import copy
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest import mock
import datetime as dt

spec = importlib.util.spec_from_file_location('sync', Path(__file__).parents[1] / 'sync-football-data.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)

class FootballDataTests(unittest.TestCase):
    def setUp(self):
        season = {'id': 1, 'startDate': '2026-08-16'}
        self.fixtures = {'matches': [{'id': 10, 'season': season, 'homeTeam': {'id': 81},
            'awayTeam': {'id': 86}, 'utcDate': '2026-09-10T22:30:00Z', 'matchday': 1,
            'status': 'FINISHED', 'score': {'fullTime': {'home': 2, 'away': 0}}}]}
        self.teams = {'season': season, 'teams': [{'id': 81, 'name': 'Barcelona'}, {'id': 86, 'name': 'Madrid'}]}
        self.standings = {'season': season, 'standings': [{'type': 'TOTAL', 'table': [
            {'team': {'id': 81}, 'position': 1, 'playedGames': 1, 'points': 3}]}]}
        self.previous = {'season': {'id': 'laliga-2026-2027'}, 'matches': [{'id': 'editorial-id',
            'slug': 'existing-url', 'homeTeamId': 'fc-barcelona', 'awayTeamId': 'real-madrid',
            'mainBet': {'selection': 'Keep'}, 'analysis': 'Keep editorial'}]}

    def convert(self):
        return sync.convert(self.fixtures, self.teams, self.standings, self.previous, '2026-09-10T00:00:00+00:00')

    def test_stable_links_and_editorial_on_reschedule(self):
        first = self.convert()
        self.previous = first
        self.fixtures['matches'][0]['utcDate'] = '2026-09-20T20:00:00Z'
        second = self.convert()['matches'][0]
        self.assertEqual(second['slug'], 'existing-url')
        self.assertEqual(second['id'], 'editorial-id')
        self.assertEqual(second['analysis'], 'Keep editorial')
        self.assertEqual(second['localDate'], '2026-09-20')

    def test_statistics_and_timezone(self):
        data = self.convert()
        self.assertEqual(data['matches'][0]['localDate'], '2026-09-11')
        self.assertEqual(data['teams'][0]['form'], ['V'])
        self.assertEqual(data['teams'][1]['form'], ['D'])
        self.assertEqual(data['teams'][0]['stats']['home']['averageGoalsFor'], 2)
        self.assertIsNone(data['teams'][0]['stats']['away']['averageGoalsFor'])

    def test_missing_scores_and_pending_time(self):
        self.fixtures['matches'][0].update(status='SCHEDULED', score={'fullTime': {'home': None, 'away': None}})
        result = self.convert()
        self.assertIsNone(result['matches'][0]['score'])
        self.assertEqual(result['matches'][0]['timeStatus'], 'pending')
        self.assertEqual(result['teams'][0]['form'], [])

    def test_invalid_payloads_and_seasons(self):
        self.standings['season'] = {'id': 99}
        with self.assertRaises(ValueError): self.convert()
        self.fixtures['matches'] = []
        with self.assertRaises(ValueError): self.convert()

    def test_duplicate_fixtures_rejected(self):
        self.fixtures['matches'] *= 2
        with self.assertRaises(ValueError): self.convert()

    def test_database_upsert_and_atomic_export(self):
        data = self.convert()
        db = sqlite3.connect(':memory:')
        sync.save(db, data, {})
        sync.save(db, data, {})
        self.assertEqual(db.execute('SELECT count(*) FROM matches').fetchone()[0], 1)
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'laliga.json'
            sync.export(data, output)
            self.assertEqual(json.loads(output.read_text())['matches'][0]['slug'], 'existing-url')

    def test_fresh_cache_uses_no_api_and_reexports(self):
        with tempfile.TemporaryDirectory() as directory:
            db_path = Path(directory) / 'private.sqlite'
            output = Path(directory) / 'public.json'
            snapshot = self.convert()
            snapshot['lastUpdated'] = dt.datetime.now(dt.timezone.utc).isoformat()
            with sqlite3.connect(db_path) as db:
                sync.save(db, snapshot, {})
            with mock.patch('sys.argv', ['sync', '--db', str(db_path), '--output', str(output)]), mock.patch.object(sync, 'fetch') as request:
                sync.main()
                request.assert_not_called()
            self.assertEqual(json.loads(output.read_text()), snapshot)

    def test_cache_expires_before_the_six_hour_schedule(self):
        self.assertLess(sync.CACHE_TTL_SECONDS, 6 * 60 * 60)

    def test_failed_download_keeps_existing_public_data(self):
        with tempfile.TemporaryDirectory() as directory:
            db_path = Path(directory) / 'private.sqlite'
            output = Path(directory) / 'public.json'
            output.write_text('last good snapshot')
            with mock.patch('sys.argv', ['sync', '--db', str(db_path), '--output', str(output)]), mock.patch.dict('os.environ', {'FOOTBALL_DATA_TOKEN': 'test-only'}), mock.patch.object(sync, 'fetch', side_effect=RuntimeError('offline')):
                with self.assertRaises(RuntimeError):
                    sync.main()
            self.assertEqual(output.read_text(), 'last good snapshot')

    def test_new_season_does_not_reuse_old_editorial(self):
        self.fixtures['matches'][0]['season']['startDate'] = '2027-08-16'
        self.assertNotEqual(self.convert()['matches'][0]['slug'], 'existing-url')

if __name__ == '__main__': unittest.main()
