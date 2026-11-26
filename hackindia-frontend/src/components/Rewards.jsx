import { useEffect, useState } from "react";
import { formatEther } from "ethers";
import { useWeb3 } from "../context/useWeb3";

export default function Rewards() {
  const { reader, leaderboard, userAddress, staking } = useWeb3();
  const [week, setWeek] = useState(null);
  const [overview, setOverview] = useState(null);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!staking || !reader) return;
    let active = true;
    async function load() {
      const current = await reader.currentWeek();
      const selected = week ?? current - 1n;
      const [progress, pool, credits] = await Promise.all([
        reader.weekProgress(selected),
        reader.rewardPool(selected),
        userAddress ? reader.credits(userAddress) : 0n,
      ]);
      if (active) setOverview({ selected, current, progress, pool, credits });
    }
    load().catch(error => {
      if (active) setNotice(error.shortMessage || error.message);
    });
    return () => { active = false; };
  }, [reader, staking, userAddress, week, revision]);

  async function transact(message, action) {
    setPending(true);
    setNotice(message);
    try {
      await (await action()).wait();
      setNotice("Transaction confirmed.");
      setRevision(value => value + 1);
    } catch (error) {
      setNotice(error.shortMessage || error.message);
    } finally {
      setPending(false);
    }
  }

  if (!staking) return <main className="mx-auto max-w-2xl p-6">Weekly rewards are available on the staking registry.</main>;
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8">
      <header>
        <h1 className="text-3xl font-bold text-amber-300">Stake &amp; rewards</h1>
        <p className="mt-2 text-stone-400">Test ETH. Each fact locks 0.02 ETH for seven days. A fact loses its stake when at least five votes were cast and at least two-thirds are downvotes.</p>
      </header>
      <section className="space-y-3 rounded-xl border border-stone-800 bg-stone-950 p-4">
        <h2 className="text-xl font-semibold">Weekly reward pool</h2>
        <p>Eligible authors need at least three upvotes and more upvotes than downvotes. The top three share 50%, 30%, and 20% when all three slots are filled.</p>
        {overview && <>
          <form onSubmit={event => {
            event.preventDefault();
            setWeek(BigInt(new FormData(event.currentTarget).get("week")));
          }} className="flex flex-wrap items-center gap-2">
            <label htmlFor="reward-week">Week ID</label>
            <input key={overview.selected.toString()} id="reward-week" name="week" type="number" min="0" max={overview.current.toString()} defaultValue={overview.selected.toString()} required className="fact-input max-w-32" />
            <button className="fact-control">View</button>
          </form>
          <p>Pool: {formatEther(overview.pool)} test ETH · Reviewed {overview.progress.processed.toString()} of {overview.progress.total.toString()} authors</p>
          {overview.progress.paid && <p>Week finalized.</p>}
          {overview.progress.paid && overview.progress.winners.some(address => !/^0x0+$/.test(address)) &&
            <ol className="list-decimal space-y-1 pl-5">{overview.progress.winners.filter(address => !/^0x0+$/.test(address)).map(address =>
              <li className="break-all font-mono text-sm" key={address}>{address}</li>
            )}</ol>}
          <button className="fact-control" disabled={!leaderboard || pending || overview.selected >= overview.current || overview.progress.paid}
            onClick={() => transact("Confirm a batch of up to 50 authors.", () => leaderboard.finalizeWeek(overview.selected, 50))}>Finalize next batch</button>
        </>}
      </section>
      <section className="space-y-3 rounded-xl border border-stone-800 bg-stone-950 p-4">
        <h2 className="text-xl font-semibold">Settle and withdraw</h2>
        <p>Once a fact’s review ends, anyone can settle it. The contract credits a returned stake to the author or sends the forfeited stake to the current weekly pool.</p>
        <form className="flex flex-wrap items-end gap-2" onSubmit={event => {
          event.preventDefault();
          const title = new FormData(event.currentTarget).get("title").trim();
          if (title) transact("Confirm stake settlement in your wallet.", () => leaderboard.settleArticle(title));
        }}>
          <div className="min-w-40 flex-1">
            <label htmlFor="settle-title">Exact fact title</label>
            <input className="fact-input" id="settle-title" name="title" required />
          </div>
          <button className="fact-control" disabled={!leaderboard || pending}>Settle stake</button>
        </form>
        <p>Withdrawable: {overview ? formatEther(overview.credits) : "—"} test ETH</p>
        <button className="fact-control" disabled={!leaderboard || pending || !overview?.credits}
          onClick={() => transact("Confirm withdrawal in your wallet.", () => leaderboard.withdraw())}>Withdraw</button>
      </section>
      {!leaderboard && <p className="text-stone-400">Connect your wallet to settle, finalize, or withdraw.</p>}
      {notice && <p role="status">{notice}</p>}
    </main>
  );
}

