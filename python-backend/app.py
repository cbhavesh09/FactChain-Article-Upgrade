import os
import re
from collections import Counter

from flask import Flask, jsonify, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16_384

origins = {
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
}
stop_words = set("a an and are as at be by for from how in is it of on or that the to was were what when where which who why with".split())


@app.after_request
def allow_configured_origins(response):
    if request.path == "/extract_keywords":
        response.vary.add("Origin")
        origin = request.headers.get("Origin")
        if origin in origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.route("/")
def home():
    return jsonify(status="ok")


def extract_keywords(query):
    words = re.findall(r"[^\W\d_]{2,}", query.lower())
    counts = Counter(word for word in words if word not in stop_words)
    return sorted(counts, key=lambda word: (-counts[word], word))[:20]


@app.route("/extract_keywords", methods=["POST"])
def extract():
    data = request.get_json(silent=True)
    query = data.get("query") if isinstance(data, dict) else None
    if not isinstance(query, str) or not 1 <= len(query.strip()) <= 500:
        return jsonify(error="Query must be a string of 1 to 500 characters."), 400
    return jsonify(keywords=extract_keywords(query))


if __name__ == "__main__":
    app.run(port=int(os.environ.get("PORT", "5000")))

