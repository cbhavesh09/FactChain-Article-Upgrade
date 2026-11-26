import { useEffect, useState } from "react";
import { generateAnswer } from "../../../demo/core.mjs";

export default function ArticleAnswer({ query, articles }) {
  const [output, setOutput] = useState("");

  useEffect(() => {
    const request = new AbortController();
    const { signal } = request;
    generateAnswer(query, articles, signal, fraction => {
      if (!signal.aborted) {
        setOutput(fraction === null ? "Generating an answer…" : `Loading model weights… ${Math.round(fraction * 100)}%`);
      }
    }).then(response => {
      if (!signal.aborted) setOutput(response);
    }).catch(error => {
      if (!signal.aborted) setOutput(error.message);
    });
    return () => request.abort();
  }, [query, articles]);

  return (
    <section aria-labelledby="article-answer-heading" className="rounded-xl border border-blue-400 bg-blue-950 p-4 text-blue-50">
      <h2 id="article-answer-heading" className="font-bold text-blue-200">Answer</h2>
      <p className="mt-2 whitespace-pre-wrap" role="status">{output || "Preparing the answer…"}</p>
    </section>
  );
}
