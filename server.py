import http.server
import socketserver
import json
import os
import threading
import time
from datetime import datetime
from scraper import scrape_and_build_dataset

PORT = 20140
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "ipu_latest.json")
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Thread lock for scraper
scrape_lock = threading.Lock()
last_scraped_at = None

def hourly_scraper_worker():
    global last_scraped_at
    while True:
        try:
            print(f"[Hourly Daemon] Running scheduled sync at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}...")
            with scrape_lock:
                scrape_and_build_dataset(os.path.join(BASE_DIR, "data"))
                last_scraped_at = datetime.now().isoformat()
        except Exception as e:
            print(f"[Hourly Daemon Error]: {e}")
        # Sleep for 1 hour (3600 seconds)
        time.sleep(3600)

class IPURequestHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        # Override to serve from static directory by default
        clean_path = path.split("?")[0]
        if clean_path == "/" or clean_path == "/index.html":
            return os.path.join(STATIC_DIR, "index.html")
        elif clean_path.startswith("/static/"):
            rel_path = clean_path[len("/static/"):]
            return os.path.join(STATIC_DIR, rel_path)
        else:
            return os.path.join(STATIC_DIR, clean_path.lstrip("/"))

    def do_GET(self):
        clean_path = self.path.split("?")[0]
        
        if clean_path == "/api/live":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
                self.wfile.write(content.encode("utf-8"))
            else:
                self.wfile.write(json.dumps({"error": "Data not ready"}).encode("utf-8"))
            return

        elif clean_path == "/api/comparison":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if os.path.exists(DATA_FILE):
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.wfile.write(json.dumps(data.get("comparisons", []), ensure_ascii=False).encode("utf-8"))
            else:
                self.wfile.write(b"[]")
            return

        elif clean_path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            status_data = {
                "server_time": datetime.now().isoformat(),
                "port": PORT,
                "data_cached": os.path.exists(DATA_FILE),
                "last_scraped_at": last_scraped_at
            }
            self.wfile.write(json.dumps(status_data).encode("utf-8"))
            return

        # Serve static files
        super().do_GET()

    def do_POST(self):
        clean_path = self.path.split("?")[0]
        if clean_path == "/api/scrape":
            def run_trigger():
                with scrape_lock:
                    scrape_and_build_dataset(os.path.join(BASE_DIR, "data"))
            t = threading.Thread(target=run_trigger, daemon=True)
            t.start()
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "scrape_initiated", "message": "Scraper Patchright sedang berjalan..."}).encode("utf-8"))
            return
        
        self.send_response(404)
        self.end_headers()

def run_server():
    # Start hourly scraper background daemon
    daemon = threading.Thread(target=hourly_scraper_worker, daemon=True)
    daemon.start()

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), IPURequestHandler) as httpd:
        print(f"============================================================")
        print(f"  IPU Malaysia 3D Dashboard Web App running!")
        print(f"  Localhost URL: http://localhost:{PORT}")
        print(f"  Live API:      http://localhost:{PORT}/api/live")
        print(f"============================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")

if __name__ == "__main__":
    run_server()
