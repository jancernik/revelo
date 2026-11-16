"""A controllable local model server for lifecycle tests."""
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

args = sys.argv[1:]
log = os.environ["FAKE_LLAMA_LOG"]
mode = os.environ.get("FAKE_LLAMA_MODE", "")
ready_at = time.monotonic() + float(os.environ.get("FAKE_LLAMA_LOAD_SECONDS", "0"))
reply = os.environ["FAKE_LLAMA_REPLY"]


def record(entry: dict) -> None:
    with open(log, "a") as file:
        file.write(json.dumps({"pid": os.getpid(), **entry}) + "\n")


record({"args": args})
if mode == "exit":
    sys.exit(3)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def ready(self) -> bool:
        return mode != "never-ready" and time.monotonic() >= ready_at

    def do_GET(self):
        self.send(200 if self.path == "/health" and self.ready() else 503, {})

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if not self.ready():
            self.send(503, {"error": "Loading model"})
            return
        record({"request": body})
        if mode == "hang":
            time.sleep(60)
        if mode == "reject":
            self.send(400, {"error": "The request exceeds the context size"})
            return
        self.send(200, {"choices": [{"message": {"content": reply}}]})

    def send(self, status: int, payload: dict) -> None:
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


HTTPServer(("127.0.0.1", int(args[args.index("--port") + 1])), Handler).serve_forever()
