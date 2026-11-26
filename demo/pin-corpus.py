"""Pin original corpus bytes on a running Kubo node and verify each returned CID."""
import json
import subprocess
from pathlib import Path

corpus = Path(__file__).resolve().parent / "corpus"
records = json.loads((corpus / "index.json").read_text(encoding="utf-8"))
for record in records:
    expected = record["cid"]
    result = subprocess.run(
        ["ipfs", "block", "put", "--cid-codec=raw", "--mhtype=sha2-256", "--pin",
         str(corpus / (expected + ".txt"))],
        check=True, capture_output=True, text=True,
    )
    actual = result.stdout.strip()
    if actual != expected:
        raise SystemExit(f"{record['id']}: expected {expected}, got {actual}")
    print(f"{record['id']}: {actual}")

