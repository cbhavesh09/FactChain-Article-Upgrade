import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWeb3 } from "../context/useWeb3";
import { readArticle } from "../ipfs";
import ArticleAnswer from "./ArticleAnswer";
import { readSearchEntries } from "../registry.mjs";
import AnswerGallery, { answerImages } from "./AnswerGallery";
import FactCitation from "./FactCitation";
import { retrieve } from "../../../demo/core.mjs";


function Results({ query, leaderboard, legacyReader, olderReader }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function search() {
      try {
        const registries = [leaderboard, legacyReader, olderReader].filter(Boolean);
        const boards = await Promise.all(registries.map(async registry => {
          const entries = registry !== leaderboard ? await registry.getLeaderboard() : await readSearchEntries(registry);
          return entries.map(entry => ({ entry, registry }));
        }));
        const board = boards.flat();
        const { signal } = controller;
        const indexed = [];
        for (let offset = 0; offset < board.length; offset += 6) {
          signal.throwIfAborted();
          const batch = await Promise.all(board.slice(offset, offset + 6).map(async ({ entry: { title, titleHash }, registry }) => {
            const entry = { id: registry.target + ":" + titleHash, title, titleHash };
            try {
              const [cid, author, likes, dislikes] = await registry.getArticleDetails(title);
              const { body, image } = await readArticle(cid, signal);
              return { ...entry, cid, author, likes: String(likes), dislikes: String(dislikes), body, image };
            } catch {
              return entry;
            }
          }));
          indexed.push(...batch);
        }
        const seen = new Set();
        const candidates = indexed.filter(article => {
          if (!article.cid) return true;
          const key = article.title + ":" + article.cid;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const articles = retrieve(candidates, query);
        const unavailable = indexed.filter(article => !article.author).length;
        if (!controller.signal.aborted) setResult({ articles, unavailable });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ error: error.shortMessage || error.message });
      }
    }

    search();
    return () => controller.abort();
  }, [query, leaderboard, legacyReader, olderReader]);

  if (!result) return <p role="status">Searching for articles…</p>;
  if (result.error) return <p role="alert">{result.error}</p>;
  if (!result.articles.length) return <p>{result.unavailable ? "No matches in the articles we could read. Some IPFS articles are unavailable." : "No articles match your search."}</p>;

  const available = result.articles.filter(article => article.author);
  const context = available.slice(0, 3).map(({ title, body }) => ({ title, text: body.slice(0, 1200) }));
  const displayed = [...available, ...result.articles.filter(article => !article.author)];
  const images = answerImages(available, query);
  return <>
    {context.length > 0 && <div className={images.length ? "grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_17rem]" : ""}>
      <ArticleAnswer query={query} articles={context} />
      {images.length > 0 && <AnswerGallery images={images} />}
    </div>}
    {displayed.map(({ id, title, author, likes, dislikes, body, cid }, index) => (
    <article key={id} className="rounded-xl bg-stone-800 p-4">
      <h2 className="text-xl font-bold">[{index + 1}] {title}</h2>
      <p className="whitespace-pre-wrap break-words">{body ?? "Article content is currently unavailable."}</p>
      <FactCitation title={title} cid={cid} />
      {author && <p className="break-all text-sm text-stone-400">By {author} · {likes} likes · {dislikes} dislikes</p>}
    </article>
    ))}
  </>;
}

export default function Search() {
  const { reader: leaderboard, legacyReader, olderReader, userAddress } = useWeb3();
  const [params, setParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const query = (params.get("query") || "").trim();

  function submit(event) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("query").trim();
    if (value === query) setRevision(previous => previous + 1);
    else setParams(value ? { query: value } : {});
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-3xl font-bold">Search articles</h1>
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <label htmlFor="article-query" className="sr-only">Search articles or ask a question</label>
        <input key={query} id="article-query" name="query" maxLength={500} defaultValue={query} placeholder="Search articles or ask a question" className="min-w-0 flex-1 rounded-lg bg-stone-800 p-3" />
        <button className="rounded-lg bg-indigo-700 px-4">Search</button>
      </form>
      {!leaderboard && <p>Connect your wallet to search the article registry.</p>}
      {leaderboard && query && <Results key={`${userAddress}:${query}:${revision}`} query={query} leaderboard={leaderboard} legacyReader={legacyReader} olderReader={olderReader} />}
    </main>
  );
}










