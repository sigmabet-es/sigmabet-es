import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('history',Path(__file__).parents[1]/'sync-football-history.py')
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
class HistoryTests(unittest.TestCase):
 def test_missing_is_not_zero(self):
  self.assertIsNone(h.number(None));self.assertIsNone(h.number(''));self.assertEqual(h.number('0%'),0)
 def test_half_goals(self):
  m={'score':{'home':3,'away':1},'stats':{'firstHalfGoals':{'home':1,'away':None}}}
  h.derive_second_half(m);self.assertEqual(m['stats']['secondHalfGoals'],{'home':2,'away':None})
 def test_independent_referee_samples(self):
  m={'id':'a','seasonId':'laliga-2024-2025','status':'finalizado','homeTeamId':'a','awayTeamId':'b','score':{'home':1,'away':0},'referee':'Ref','stats':{'yellowCards':{'home':2,'away':3},'redCards':{'home':0,'away':None}}}
  r=h.aggregates([m])['referees'][0];self.assertEqual(r['yellowCards']['average'],5);self.assertIsNone(r['redCards']['average'])
 def test_provenance_and_no_null_overwrite(self):
  m={};h.set_stat(m,'redCards','home',0,'csv');h.set_stat(m,'redCards','home',None,'api',True)
  self.assertEqual(m['stats']['redCards']['home'],0);self.assertEqual(m['statSources']['redCards']['home'],'csv')
 def test_selected_scope_excludes_advanced_fields(self):
  self.assertEqual(h.REQUIRED, ['firstHalfGoals','secondHalfGoals','shots','shotsOnTarget',
      'corners','yellowCards','redCards','fouls'])
  self.assertNotIn('xg', h.CSV_STATS)
if __name__=='__main__':unittest.main()
