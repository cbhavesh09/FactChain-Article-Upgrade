import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/useWeb3";
import { readArticle } from "../ipfs";
import FactImage from "./FactImage";

const paged = import.meta.env.VITE_PAGED_REGISTRY === "true";

export default function RandomFact() {
  const { reader } = useWeb3();
  const [shuffle, setShuffle] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!reader) return;
    const request = new AbortController();
    const { signal } = request;
    async function draw() {
      try {
        let entry;
        if (paged) {
          const count = Number(await reader.articleCount());
          if (count) {
            const [items] = await reader.getArticlePage(Math.floor(Math.random() * count), 1);
            entry = items[0];
          }
        } else {
          const items = await reader.getLeaderboard();
          entry = items[Math.floor(Math.random() * items.length)];
        }
        if (!entry) {
          if (!signal.aborted) setResult({ shuffle, empty: true });
          return;
        }
        const [cid, author] = await reader.getArticleDetails(entry.title);
        const article = await readArticle(cid, signal);
        if (!signal.aborted) setResult({ shuffle, title: entry.title, cid, author, ...article });
      } catch (error) {
        if (!signal.aborted) setResult({ shuffle, error: error.shortMessage || error.message });
      }
    }
    draw();
    return () => request.abort();
  }, [reader, shuffle]);

  const current = result?.shuffle === shuffle ? result : null;
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-amber-400">Random fact</h1>
        <button className="fact-control" onClick={() => setShuffle(value => value + 1)} disabled={!reader}>Draw another</button>
      </header>
      {!reader && <p>Connect your wallet to discover facts.</p>}
      {reader && !current && <p role="status">Drawing a fact…</p>}
      {current?.empty && <p>No facts have been published yet.</p>}
      {current?.error && <p role="alert">{current.error}</p>}
      {current?.title && <article className="rounded-2xl border border-stone-800 bg-stone-950 p-6">
        <h2 className="break-words text-2xl font-semibold">{current.title}</h2>
        <p className="mt-4 whitespace-pre-wrap break-words">{current.body}</p>
        <FactImage image={current.image} />
        <dl className="mt-5 grid gap-1 border-t border-stone-800 pt-4 text-sm text-stone-400">
          <dt>On-chain author</dt><dd className="break-all font-mono">{current.author}</dd>
          <dt>IPFS content ID</dt><dd className="break-all font-mono text-amber-300">{current.cid}</dd>
        </dl>
        <Link className="fact-control mt-4 inline-block" to={"/search?" + new URLSearchParams({ query: current.title })}>Find related facts</Link>
      </article>}
    </main>
  );
}

