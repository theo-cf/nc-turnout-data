import http.server, os, sys, urllib.request
ROOT = sys.argv[1]
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0].lstrip('/')
        f = os.path.join(ROOT, path)
        if os.path.isfile(f): body = open(f, 'rb').read()
        else:
            try: body = urllib.request.urlopen('https://theo-cf.github.io/nc-turnout-data/' + path).read()
            except Exception: self.send_response(404); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers(); return
        self.send_response(200); self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(body)
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('127.0.0.1', 8123), H).serve_forever()
