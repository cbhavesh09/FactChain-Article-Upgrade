import { Link, useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/useWeb3";
import Logo from "../assets/logo.png";

export default function Home() {
  const navigate = useNavigate();
  const { staking } = useWeb3();

  function search(event) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("query").trim();
    if (query) navigate("/search?" + new URLSearchParams({ query }));
  }

  return (
    <main className="home-hero">
      <h1 className="text-4xl font-bold tracking-tight text-amber-400 sm:text-6xl">FactChain</h1>
      <p className="text-center text-stone-400">Discover and verify community-published facts.</p>
      <img className="home-bulb" src={Logo} alt="FactChain light bulb made from chain links" />
      <form onSubmit={search} className="flex w-full max-w-xl gap-2">
        <label htmlFor="home-query" className="sr-only">Search facts</label>
        <input id="home-query" name="query" required maxLength={500} placeholder="Search articles, facts..." className="min-w-0 flex-1 rounded-xl border border-stone-700 bg-stone-900 px-4 py-3" />
        <button className="rounded-xl bg-amber-400 px-4 font-semibold text-black">Search</button>
      </form>
      <nav className="flex flex-wrap justify-center gap-2" aria-label="Explore FactChain">
        <Link className="fact-control" to="/random">Random fact</Link>
        <Link className="fact-control" to="/leaderboard">Leaderboard</Link>
        <Link className="fact-control" to="/contribute">Contribute</Link>
        {staking && <Link className="fact-control" to="/rewards">Stake &amp; rewards</Link>}
      </nav>
    </main>
  );
}


