#!/usr/bin/env python3
"""check_repo.py: run this before you commit or push.

  python3 tools/check_repo.py

Checks
  1. Secrets: no API keys, tokens, private keys or .env files.
  2. Personal details: no names, places, brands or live IDs from the original install, no real email
     addresses outside the placeholder domains and no real phone numbers outside the fictional test ranges.
  3. Links: every relative link in a markdown file points to a file and heading that exist.
  4. Syntax: every JSON file parses, and every JavaScript file passes `node --check` when Node is installed.
  5. Writing: no em or en dashes in the guides and the library. Set SLOP_SCAN to the path of slop_scan.py
     to also check the guides for AI writing tells.

It exits with 1 when it finds a problem, so you can use it in a pre-commit hook or a CI job.
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".vercel", "test-results", "playwright-report", "shots"}
TEXT_EXT = {".md", ".txt", ".py", ".json", ".js", ".mjs", ".cjs", ".html", ".css", ".sql", ".toml", ".yml", ".yaml", ".svg", ".example"}
TEXT_NAMES = {"LICENSE", ".gitignore", ".vercelignore"}
DOCS = ["README.md", "START-HERE.md", "SETUP.md", "CUSTOMIZE.md", "AGENTS.md", "CLAUDE.md", "GEMINI.md", "THIRD_PARTY_NOTICES.md", "DESIGN.md", ".claude/commands/setup.md"]

# Names, places, brands and live IDs from the original install. Stored as SHA-256 hashes of the
# lowercase phrase (words of letters and digits joined by one space) so this file doesn't spell them out.
# To add your own: python3 -c "import hashlib; print(hashlib.sha256(b'your phrase').hexdigest())"
BLOCKED_HASHES = {
    "0a00c278cb9a4e7aaf5c9bb3a4378f3f0b71f0ca2da44fc7be9edafe6c3a1931",
    "16cc2fc0413e2b3d569f5465446e6dd0028d57eb85aae433618774f585abd9f0",
    "1e6e0af284e06a8ad32288e2d7941038daf8c770b989792d26121a93c11518a5",
    "217ef39d9d59b7268bad96f61566cd3dcb06cddcef6ab3da9d8ce529602ce036",
    "243801106c4d7b8f43fb87ea881d0e8e079435d199132d411bc612ffb56f9e6e",
    "2447cb3a6f6add54d391a69e541f4798566d9bc9a6ac3e8362232bb51b1d19c3",
    "248c65ea0a3bf79744f9ef2cad9477ebd460e8d49734ff6ad8ac20e2782d5003",
    "2904dffee8b0bb27fff8e1183f42c73c98c5e26637156b36e04ca433ef241a4c",
    "33689a386ce71df1f8cebca6a3df929d449b639e71ed879347ac1db73927158e",
    "33ea25bc7199b4891f34aab7fece142b9c2865c2b7507c759747dc283012956f",
    "403dd2f5a78a46e17e7d9d6d6807e8ef120c80dadb533c5d99df137bc67f4d4e",
    "42d5b6f7cd4d84be683e61e5648b1b14a687f8d7cf9363c00ce0af47b5683f39",
    "468ba7cd68b054147524da74d2d0098d9b7243cb9f259a6e9a0acac67f00c49d",
    "46bfd83caaf96938908f915306a5ff53d65a970517ff557a35c843cc488acd4b",
    "5360c47b3e9c37a7c316e771532873aa8093be6f5a2ef441c13733247e67d3a4",
    "53e98f82e6090430bd4004fec6d5a8744ab0a7756ca0a90af3365f3e217795a2",
    "5a1b71f88f1e6cb4211ec7529f249694e12e6539beebc2bab83a7cf1e9fce50e",
    "625fe74cad4600b5e8b76a9283333eb79052ae50d6af7f660feb4831d87af5d2",
    "8930d399db295e02aa5922fa3c4e6cf1afcb11edea9dbdf42f75c1f2afb88b8b",
    "8f308606012e2ddde9c7a8e8b90c56a748b9c10835329c81c0a97fe89de70bd0",
    "9508a0c88ec73f9a11f94e7d1b48b07524583b328ca0fd55b940ff60743c9eec",
    "974b26cf5bdbe853d97d842ef7658da0ef9e5ac6886e45e464fe048682859cf2",
    "980f3381e6ab5f430ba91ca3d652bc19122bd522b839e213462c49a3aa55e9be",
    "983f47b3080502d40b8d477e532f13f12c9e65eef2b3dabcb3d76ac804e3be13",
    "9ecce41cd29b3027b6d027ea8c96c076e38b841cb3ba856e1c5851292f06f5c9",
    "acf9e97160368047fd4a304b4c5c555cc210cd162144e376cb1b6099fed854c5",
    "bf49d6090d2a65c4a4a7ad8e801b2a3c3f62f42d84c374c2d0fb9228159e2d3d",
    "c5d6c913c02bb086f0e866d2d15bb4f8440d82855c91bd9a70923ebdc66ec463",
    "ccedd614a7f6bd1d39ec701b47314fe3416824ee9395b085d21ef4cf26025fed",
    "d664f8d0dec09c35fdcca2a67bf8f0c6d2ab85f845d0c9547d4d0d360f071f0b",
    "d6ee31cabfe60c244ef9bdfa84c5563148c459f7f78aebf43ea75292a9d4d1a0",
    "de145234905ea55d8595151cc03c68f1f594beb7eabf3dac599253b971a7a1c6",
    "e41cfe7970a7749c619a5655306bda5386c60fe70377563c060b8efcea4e040e",
    "f5d415e49950ec08cd35ef23921284a257951f3095aa029e2165607e864f31a2",
    "f9b0a230fc9d9a5fa9ac1d2e75ef87f60efb2249336dffdef633c72f8aacd6b3",
}
# The author credit may appear in these files only.
CREDIT_FILES = {"README.md", "LICENSE"}
CREDIT_HASHES = {
    "16cc2fc0413e2b3d569f5465446e6dd0028d57eb85aae433618774f585abd9f0",
}
# Exact text that may appear anywhere: the address of the template repository, used for the setup guide and updates.
ALLOWED_TEXT = ["github.com/gustensun/funnel-os-kit"]
WORD_RE = re.compile(r"[a-z0-9]+")

SECRET_PATTERNS = [
    ("Anthropic key", r"sk-ant-[A-Za-z0-9_-]{20,}"),
    ("OpenAI project key", r"sk-proj-[A-Za-z0-9_-]{20,}"),
    ("OpenRouter key", r"sk-or-[A-Za-z0-9_-]{20,}"),
    ("OpenAI key", r"\bsk-[A-Za-z0-9]{32,}\b"),
    ("ElevenLabs key", r"\bsk_[a-f0-9]{40,}\b"),
    ("GitHub token", r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    ("GitHub token", r"github_pat_[A-Za-z0-9_]{40,}"),
    ("Google API key", r"AIza[0-9A-Za-z_-]{35}"),
    ("Supabase secret key", r"sb_secret_[A-Za-z0-9_-]{10,}"),
    ("Supabase publishable key", r"sb_publishable_[A-Za-z0-9_-]{20,}"),
    ("HighLevel token", r"\bpit-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b"),
    ("Slack token", r"\bxox[abpr]-[A-Za-z0-9-]{10,}"),
    ("Stripe key", r"\b[rs]k_live_[A-Za-z0-9]{20,}"),
    ("AWS key", r"\bAKIA[0-9A-Z]{16}\b"),
    ("xAI key", r"\bxai-[A-Za-z0-9]{40,}"),
    ("Perplexity key", r"\bpplx-[A-Za-z0-9]{40,}"),
    ("Private key", r"-----BEGIN [A-Z ]*PRIVATE KEY-----\s*[A-Za-z0-9+/=\s]{40,}"),
    ("JSON web token", r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),
]
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})")
ALLOWED_EMAIL_DOMAINS = {"example.com", "example.net", "example.org", "yourdomain.com"}  # and any domain ending in .example or .test
ALLOWED_EMAILS = set()
NOT_EMAIL_ENDINGS = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".js", ".mjs", ".css", ".json")
# Phone numbers: only the fictional ranges set aside for drama and tests (UK 07700 900xxx, US 555-01xx).
PHONE_RE = re.compile(r"(?<![\w.])\+\d[\d ().-]{8,18}\d")
TEST_PHONES = ("447700900", "1555")
# Generated from the public template gallery: page text of example businesses, checked for secrets and names only.
THIRD_PARTY_TEXT = {"api/_tpl_lib.json", "api/_templates.json", "js/fos-templates.js"}
DASH_RE = re.compile("[\u2013\u2014]")

NODE_CHECK = (
    "const fs=require('fs'),vm=require('vm'),M=require('module');"
    "for(const f of process.argv.slice(1)){try{new vm.Script(M.wrap(fs.readFileSync(f,'utf8')),{filename:f})}"
    "catch(e){console.log(f+'\\t'+String(e.message).split('\\n')[0])}}"
)
LINK_RE = re.compile(r"\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
HEADING_RE = re.compile(r"^#{1,6}\s+(.*?)\s*#*\s*$")


def walk():
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = sorted(d for d in dns if d not in SKIP_DIRS)
        for fn in sorted(fns):
            if os.path.splitext(fn)[1] in TEXT_EXT or fn in TEXT_NAMES or fn.startswith(".env"):
                yield os.path.join(dp, fn)


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, "/")


def line_of(text, pos):
    return text.count("\n", 0, pos) + 1


def blocked_phrases(text, cache={}):
    """Yield (line, phrase, hash) for every 1 to 3 word phrase on the blocked list."""
    low = text.lower()
    words = [(m.group(0), m.start()) for m in WORD_RE.finditer(low)]
    for size in (1, 2, 3):
        for i in range(len(words) - size + 1):
            phrase = " ".join(w for w, _ in words[i:i + size])
            if phrase not in cache:
                digest = hashlib.sha256(phrase.encode()).hexdigest()
                cache[phrase] = digest if digest in BLOCKED_HASHES else None
            if cache[phrase]:
                yield line_of(low, words[i][1]), phrase, cache[phrase]


def slug(heading, seen):
    s = re.sub(r"[`*_~]|\[|\]\([^)]*\)", "", heading).strip().lower()
    s = re.sub(r"[^\w\- ]", "", s).replace(" ", "-")
    n = seen.get(s, 0)
    seen[s] = n + 1
    return s if n == 0 else f"{s}-{n}"


def anchors(path, cache={}):
    if path not in cache:
        seen, found, fence = {}, set(), False
        for line in open(path, encoding="utf-8"):
            if line.lstrip().startswith("```"):
                fence = not fence
                continue
            m = None if fence else HEADING_RE.match(line)
            if m:
                found.add(slug(m.group(1), seen))
        cache[path] = found
    return cache[path]


def main():
    errors, notes = [], []

    for path in walk():
        r = rel(path)
        name = os.path.basename(path)
        if name.startswith(".env") and name != ".env.example":
            errors.append(f"{r} is an environment file. Delete it and keep values in Vercel instead.")
            continue
        try:
            text = open(path, encoding="utf-8").read()
        except UnicodeDecodeError:
            continue

        # 1. secrets
        if r != "tools/check_repo.py":
            for label, pat in SECRET_PATTERNS:
                for m in re.finditer(pat, text):
                    errors.append(f"{r}:{line_of(text, m.start())} possible {label}. Remove it and keep it in Vercel or in Members and settings.")
        if name == ".env.example":
            for i, line in enumerate(text.splitlines(), 1):
                m = re.match(r"^([A-Z0-9_]+)=(\S*)", line)
                if m and m.group(2) and not m.group(2).startswith("#"):
                    errors.append(f"{r}:{i} {m.group(1)} has a value. Leave every value in .env.example empty.")

        # 2. personal details
        scan = text
        for allowed in ALLOWED_TEXT:
            scan = scan.replace(allowed, " " * len(allowed))
        for line, phrase, digest in blocked_phrases(scan):
            if digest in CREDIT_HASHES and r in CREDIT_FILES:
                continue
            errors.append(f"{r}:{line} name, place, brand or live ID from the original install: '{phrase}'. "
                          f"If it's your own wording, delete the hash starting {digest[:12]} from BLOCKED_HASHES in this file.")
        if r != "tools/check_repo.py" and r not in THIRD_PARTY_TEXT:
            for m in EMAIL_RE.finditer(text):
                email, domain = m.group(0), m.group(1).lower()
                if m.start() and text[m.start() - 1] == "\\":
                    continue  # an escape such as \n before a social handle, not an address
                if email.lower().endswith(NOT_EMAIL_ENDINGS) or domain in ALLOWED_EMAIL_DOMAINS or domain.endswith((".example", ".test")) or email.lower() in ALLOWED_EMAILS:
                    continue
                errors.append(f"{r}:{line_of(text, m.start())} real-looking email address '{email}'. Use an example.com address.")
            for m in PHONE_RE.finditer(text):
                digits = re.sub(r"\D", "", m.group(0))
                if 10 <= len(digits) <= 15 and not digits.startswith(TEST_PHONES):
                    errors.append(f"{r}:{line_of(text, m.start())} real-looking phone number '{m.group(0)}'. Use a test number like +44 7700 900123.")

        # 5. dashes in the guides and the library
        if r in DOCS or (r.startswith("library/") and r.endswith(".md")):
            for m in DASH_RE.finditer(text):
                errors.append(f"{r}:{line_of(text, m.start())} em or en dash. Use a comma, a colon or a full stop.")

        # 3. links
        if r.endswith(".md"):
            for m in LINK_RE.finditer(text):
                target = m.group(1)
                if target.startswith(("http://", "https://", "mailto:")):
                    continue
                file_part, _, frag = target.partition("#")
                dest = os.path.normpath(os.path.join(os.path.dirname(path), file_part)) if file_part else path
                where = f"{r}:{line_of(text, m.start())}"
                if not os.path.exists(dest):
                    errors.append(f"{where} broken link -> {target}")
                elif frag and dest.endswith(".md") and frag not in anchors(dest):
                    errors.append(f"{where} link to a heading that doesn't exist -> {target}")

        # 4. JSON
        if r.endswith(".json"):
            try:
                json.loads(text)
            except ValueError as e:
                errors.append(f"{r} is not valid JSON: {e}")

    # 4. JavaScript
    node = shutil.which("node")
    if node:
        js = []
        for folder in ("js", "api", "scripts", "test"):
            d = os.path.join(ROOT, folder)
            if os.path.isdir(d):
                js += [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.endswith((".js", ".cjs"))]
        js = [f for f in js if os.path.exists(f)]
        # One Node process parses every file the way `node --check` does, which is much faster than one process per file.
        res = subprocess.run([node, "-e", NODE_CHECK, *js], capture_output=True, text=True)
        for line in res.stdout.splitlines():
            f, _, msg = line.partition("\t")
            errors.append(f"{rel(f)} has a syntax error: {msg}")
        if res.returncode and not res.stdout:
            errors.append("The JavaScript syntax check couldn't run: " + (res.stderr.strip().splitlines() or ["unknown error"])[0])
    else:
        notes.append("Node isn't installed, so the JavaScript syntax check was skipped.")

    # 6. writing
    scanner = os.environ.get("SLOP_SCAN")
    if scanner:
        if not os.path.exists(scanner):
            errors.append(f"SLOP_SCAN points to {scanner}, which doesn't exist.")
        else:
            for doc in DOCS:
                p = os.path.join(ROOT, doc)
                if not os.path.exists(p):
                    continue
                res = subprocess.run([sys.executable, scanner, p], capture_output=True, text=True)
                out = (res.stdout + res.stderr).strip()
                if res.returncode:
                    errors.append(f"{doc} has writing findings:\n{out}")
    else:
        notes.append("Writing check skipped. Set SLOP_SCAN to the path of slop_scan.py to run it.")

    for n in notes:
        print("NOTE  ", n)
    for e in errors:
        print("ERROR ", e)
    print(f"\n{len(errors)} problem{'' if len(errors) == 1 else 's'} found" if errors else "\nAll checks passed")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
