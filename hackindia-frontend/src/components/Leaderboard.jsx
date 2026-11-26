import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/useWeb3";
import { pageSize, readRegistryPage } from "../registry.mjs";

const paged = import.meta.env.VITE_PAGED_REGISTRY === "true";

export default function Leaderboard() {
  const { leaderboard, reader, legacyReader } = useWeb3();
  const [archive, setArchive] = useState(false);
  const registry = archive ? legacyReader : reader;
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const [voteError, setVoteError] = useState("");

  useEffect(() => {
    if (!registry) return;
    let active = true;
    async function load() {
      try {
        let data;
        if (paged && !archive) data = await readRegistryPage(registry, page);
        else {
          const all = await registry.getLeaderboard();
          data = { entries: all.slice(page * pageSize, (page + 1) * pageSize), total: all.length };
        }
        if (!active) return;
        const lastPage = Math.max(0, Math.ceil(data.total / pageSize) - 1);
        if (page > lastPage) setPage(lastPage);
        else setResult({ registry, page, ...data });
      } catch (error) {
        if (active) setResult({ registry, page, error: error.shortMessage || error.message });
      }
    }
    load();
    return () => { active = false; };
  }, [registry, archive, revision, page]);

  async function vote(title, liked) {
    setPending(true);
    setVoteError("");
    try {
      await (await leaderboard.voteArticle(title, liked)).wait();
      setRevision(value => value + 1);
    } catch (error) {
      setVoteError(error.shortMessage || error.message);
    } finally {
      setPending(false);
    }
  }

  const current = result?.registry === registry && result?.page === page ? result : null;
  const entries = [...(current?.entries || [])].sort((a,b) => Number(b.ratio - a.ratio));

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <header className="mb-6 border-b border-stone-800 pb-5">
        <h1 className="text-3xl font-bold text-amber-400">Community leaderboard</h1>
        <p className="mt-2 text-stone-400">{paged && !archive ? "Browse registry pages, with the highest positive-vote ratios first on each page." : "Articles ranked by positive-vote ratio."}</p>
        {current?.total != null && <p className="mt-2 text-sm">{current.total.toLocaleString()} facts in this registry</p>}
        {legacyReader && <button type="button" className="fact-control mt-3" onClick={() => { setArchive(value => !value); setPage(0); }}>
          {archive ? "Back to current registry" : "Browse original registry"}
        </button>}
      </header>
      {!reader && <p>Connect your wallet to load the leaderboard.</p>}
      {reader && !current && <p role="status">Loading facts…</p>}
      {current?.error && <p role="alert">{current.error}</p>}
      {voteError && <p role="alert">{voteError}</p>}
      {pending && <p role="status">Confirm the vote in your wallet.</p>}
      {current?.total === 0 && <p>No facts have been published yet.</p>}
      <ol className="space-y-2">
        {entries.map(({ titleHash, title, ratio }) => (
          <li key={titleHash} className="grid gap-3 rounded-xl border border-stone-800 bg-stone-950 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <Link className="break-words font-semibold text-stone-100 hover:text-amber-400" to={"/search?" + new URLSearchParams({ query: title })}>{title}</Link>
              <div className="mt-2 flex items-center gap-2">
                <progress aria-label="Positive votes" className="h-2 max-w-32 accent-amber-400" max="10000" value={Number(ratio)} />
                <span className="text-sm text-amber-300">{(Number(ratio) / 100).toFixed(2)}%</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button disabled={archive || !leaderboard || pending} className="fact-control" onClick={() => vote(title, true)}>Upvote</button>
              <button disabled={archive || !leaderboard || pending} className="fact-control" onClick={() => vote(title, false)}>Downvote</button>
            </div>
          </li>
        ))}
      </ol>
      {reader && !archive && !leaderboard && <p className="mt-4 text-sm text-stone-400">Connect your wallet to vote.</p>}
      {current?.total > 0 && <nav aria-label="Leaderboard pagination" className="mt-5 flex items-center justify-between gap-2">
        <button className="fact-control" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button>
        <form className="flex items-center gap-2" onSubmit={event => {
          event.preventDefault();
          const value = Number(new FormData(event.currentTarget).get("page"));
          if (Number.isInteger(value) && value >= 1 && value <= Math.ceil(current.total / pageSize)) setPage(value - 1);
        }}>
          <label className="text-sm text-stone-400" htmlFor="leaderboard-page">Page</label>
          <input key={page} id="leaderboard-page" name="page" className="w-16 rounded border border-stone-700 px-2 py-1" type="number" min="1" max={Math.ceil(current.total / pageSize)} defaultValue={page + 1} required />
          <span className="text-sm text-stone-400">of {Math.ceil(current.total / pageSize).toLocaleString()}</span>
          <button className="fact-control">Go</button>
        </form>
        <button className="fact-control" disabled={(page + 1) * pageSize >= current.total} onClick={() => setPage(page + 1)}>Next</button>
      </nav>}
    </main>
  );
}


