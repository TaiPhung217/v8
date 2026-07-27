import sys
import http.server
import socketserver

PORT = 1234 if len(sys.argv) < 2 else int(sys.argv[1])

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()
