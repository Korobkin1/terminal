"""Offline questionnaire terminal. Python 3.10+, no external packages."""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

ROOT = Path(__file__).resolve().parent
FILES = {
    '/': ('web/index.html', 'text/html; charset=utf-8'),
    '/app.js': ('web/app.js', 'text/javascript; charset=utf-8'),
    '/style.css': ('web/style.css', 'text/css; charset=utf-8'),
    '/api/surveys': ('surveys.json', 'application/json; charset=utf-8'),
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        target = FILES.get(self.path.split('?', 1)[0])
        if target is None:
            self.send_error(404)
            return
        filename, content_type = target
        body = (ROOT / filename).read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Questionnaire answers never leave the browser and are never logged.
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    # Fail early if the questionnaire data is missing or invalid.
    json.loads((ROOT / 'surveys.json').read_text(encoding='utf-8'))
    with ThreadingHTTPServer(('127.0.0.1', args.port), Handler) as server:
        address = f'http://127.0.0.1:{server.server_port}'
        print(f'Terminal: {address}\nStop: Ctrl+C', flush=True)
        if not args.no_browser:
            webbrowser.open(address)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
