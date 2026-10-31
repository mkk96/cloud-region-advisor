"""Serve Cloud Region Advisor locally: python serve.py [port]

Like `python -m http.server`, but always sends JavaScript as
text/javascript. Some Windows machines map .js to text/plain in the
registry, and browsers refuse to run ES modules served that way.

Uses a threaded server: browsers open spare connections in advance, and a
single-threaded server can block on an idle one while module files queue.
"""
import http.server
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
        ".svg": "image/svg+xml",
    }


os.chdir(os.path.dirname(os.path.abspath(__file__)))
with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
    print(f"Cloud Region Advisor running at http://localhost:{PORT}  (Ctrl+C to stop)")
    httpd.serve_forever()
