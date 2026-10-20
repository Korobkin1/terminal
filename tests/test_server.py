import json
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import urlopen
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import Handler, ThreadingHTTPServer

class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_survey_data(self):
        with urlopen(self.base + '/api/surveys') as response:
            surveys = json.load(response)
        self.assertEqual(len(surveys), 7)
        self.assertEqual(sum(len(s['questions']) for s in surveys.values()), 174)
        for survey in surveys.values():
            self.assertTrue(survey['name'])
            self.assertTrue(all(isinstance(q, str) and q for q in survey['questions']))

    def test_assets(self):
        for path in ['/', '/app.js', '/style.css']:
            with self.subTest(path=path), urlopen(self.base + path) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers['Cache-Control'], 'no-store')
                self.assertTrue(response.read())

    def test_private_files_not_served(self):
        for path in ['/app.py', '/README.md', '/.git/config', '/../surveys.json']:
            with self.subTest(path=path):
                with self.assertRaises(HTTPError) as error:
                    urlopen(self.base + path)
                self.assertEqual(error.exception.code, 404)

if __name__ == '__main__':
    unittest.main()
