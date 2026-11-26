import { useState } from "react";
import { Link } from "react-router-dom";
import { useWeb3 } from "../context/useWeb3";
import { canPublish, imageLimit, imageTypes, pinFile, readArticle } from "../ipfs";

export default function Contribute() {
  const { leaderboard, staking } = useWeb3();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [published, setPublished] = useState(null);

  async function submit(event) {
    event.preventDefault();
    if (!leaderboard || pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const title = fields.get("title").trim();
    const body = String(fields.get("body") || "").trim();
    const existingCid = String(fields.get("cid") || "").trim();
    const file = fields.get("image");
    const alt = String(fields.get("alt") || "").trim();
    setError("");
    setPublished(null);
    if (!title || !(canPublish ? body : existingCid)) return setError("Enter a title and the required fact content.");
    if (file?.size && (!imageTypes.includes(file.type) || file.size > imageLimit)) {
      return setError("Choose a JPEG, PNG, or WebP image up to 4 MiB.");
    }
    setPending(true);
    try {
      let cid = existingCid;
      if (!canPublish) {
        setStatus("Checking that the pinned fact is readable…");
        const article = await readArticle(cid);
        if (!article.body.trim()) throw new Error("The pinned fact is empty.");
      } else {
        const article = { title, body };
        if (file?.size) {
          setStatus("Pinning image to IPFS…");
          article.image = { cid: await pinFile(file), type: file.type, alt };
        }
        setStatus("Pinning fact to IPFS…");
        cid = await pinFile(new File([JSON.stringify(article)], "fact.json", { type: "application/json" }));
      }
      setStatus("Confirm the publish transaction in your wallet.");
      const options = staking ? { value: await leaderboard.STAKE() } : {};
      await (await leaderboard.submitArticle(title, cid, options)).wait();
      form.reset();
      setPublished({ title, cid });
    } catch (failure) {
      setError(failure.shortMessage || failure.message);
    } finally {
      setStatus("");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-5 text-3xl font-bold text-amber-400">Publish a fact</h1>
      {staking && <p className="mb-4 text-amber-200">Publishing locks 0.02 test ETH for a seven-day review.</p>}
      {!canPublish && <p className="mb-4">Paste an IPFS CID for a document you have already pinned.</p>}
      {!leaderboard && <p className="mb-4">Connect your wallet to publish a fact.</p>}
      <form className="grid gap-3" onSubmit={submit}>
        <label htmlFor="fact-title">Title</label>
        <input id="fact-title" className="fact-input" name="title" maxLength={120} required />
        {canPublish ? <>
        <label htmlFor="fact-body">Fact</label>
        <textarea id="fact-body" className="fact-input" name="body" rows={6} maxLength={8000} required />
        <label htmlFor="fact-image">Image (optional, up to 4 MiB)</label>
        <input id="fact-image" className="fact-input" name="image" type="file" accept={imageTypes.join(",")} />
        <label htmlFor="fact-alt">Image description (optional)</label>
        <input id="fact-alt" className="fact-input" name="alt" maxLength={160} />
        </> : <>
          <label htmlFor="fact-cid">Pinned article CID</label>
          <input id="fact-cid" className="fact-input" name="cid" maxLength={120} required />
        </>}
        <button disabled={!leaderboard || pending} className="fact-control">Publish fact</button>
      </form>
      {status && <p role="status" className="mt-3">{status}</p>}
      {error && <p role="alert" className="mt-3 text-red-300">{error}</p>}
      {published && <p role="status" className="mt-3 break-words">Published to IPFS and the registry. <Link className="text-amber-300" to={"/search?" + new URLSearchParams({ query: published.title })}>View fact</Link><br />CID: {published.cid}</p>}
    </main>
  );
}



