import { useState } from "react";

export default function FactCitation({ title, cid }) {
  const [status, setStatus] = useState("");
  if (!cid) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${title} — ipfs://${cid}`);
      setStatus("Citation copied.");
    } catch {
      setStatus("Could not copy automatically. Select the CID to copy it.");
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-400">
      <code className="break-all text-amber-200">CID {cid}</code>
      <button type="button" className="fact-control" onClick={copy}>Copy citation</button>
      <span role="status">{status}</span>
    </div>
  );
}

