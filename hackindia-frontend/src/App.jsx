import { Link, Route, Routes } from "react-router-dom";
import Home from './components/Home';
import Leaderboard from "./components/Leaderboard";
import Contribute from './components/Contribute';
import Rewards from "./components/Rewards";
import RandomFact from "./components/RandomFact";
import Search from './components/Search';
import { useWeb3 } from "./context/useWeb3";

function App() {
  const { userAddress: address, walletBalance, connectWallet, walletError, connecting } = useWeb3();
  return (
    <div className="app-shell text-stone-300 antialiased">
      <div className="fixed inset-0 -z-10">
        <div className="relative h-full w-full bg-black">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
          <div className="absolute left-0 right-0 top-[-10%] h-[1000px] w-[1000px] rounded-full bg-[radial-gradient(circle_400px_at_50%_300px,#fbfbfb36,#000)]"></div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="font-semibold">FactChain</Link>
        {address ? (
          <div className="text-right text-sm">
            <span className="text-green-400" title={address}>Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
            {walletBalance != null && <p className="text-stone-300">Balance at connection: {walletBalance} ETH</p>}
          </div>
        ) : (
          <button onClick={connectWallet} disabled={connecting} className="bg-indigo-600 px-4 py-2 rounded text-white">
            {connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>

      <div className="route-content">
        {walletError && <p role="alert" className="mx-4 text-red-300">{walletError}</p>}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/contribute" element={<Contribute />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/random" element={<RandomFact />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;





