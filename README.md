# FactChain

FactChain is a community knowledge base. Users contribute articles, find related content, and rank articles through voting. The AI feature retrieves articles from this knowledge base and uses their text as context. Content identifiers let readers verify that a raw article body still matches its published fingerprint. Votes express community opinion.

## Try the free portfolio demo

From the repository root, run `python -m http.server 8765 --bind 127.0.0.1 --directory demo` and open `http://127.0.0.1:8765/`.

1. Search for **What is an IPFS CID?** and inspect the article's CID.
2. Submit the search to show the on-device answer above the articles. Chrome's built-in model uses up to three sources when available. The portable FLAN-T5 model receives the question and the highest-ranked article. It displays an answer extracted from that article or a labeled excerpt if it cannot find an answer.
3. Publish an article from **Contribute**, search for it, vote, and view the **Leaderboard**.

The published Pages demo runs as a static site. Its thirteen seed articles have real raw IPFS CIDs and can be read through an optional gateway. Browser contributions and votes are local to that browser. The app computes a CID for draft bodies, and publishing in this mode does not pin them to IPFS or send an Ethereum transaction.

## Run the wallet-backed app

The main React and Solidity app is in `hackindia-frontend` and `factchain copy`. The standalone Flask keyword API remains in `python-backend`. Follow [HACKATHON.md](HACKATHON.md) to configure the contract and Kubo. In that app, a wallet-signed transaction records the title and CID in the article registry, and the contract powers the leaderboard. The search view shows an automatic answer using articles successfully read from Kubo. The original UnixFS CIDs are resolved by Kubo. The raw-block browser verification described here applies to the static demo.

## Deploy to GitHub Pages

Copy the archive into the GitHub project root. Enable Actions in the fork if needed. Under **Settings → Pages → Build and deployment**, select **GitHub Actions**. Push to `main` or run **Publish FactChain** manually. The workflow publishes `demo/` by default or builds the wallet-backed site when a Sepolia registry is configured. See [HACKATHON.md](HACKATHON.md) for the public RPC, gateway, and optional upload setup. No hosted backend, wallet, or paid inference API is required for this deployment. The model may download weights on first use. The full wallet-backed mode requires its own contract and services.

## Verify IPFS

Run `python demo/pin-corpus.py` with Kubo on your PATH. It pins each seed article as a raw block and checks the CID Kubo returns. Enter the Kubo gateway URL under **IPFS gateway settings**, such as `http://127.0.0.1:8080/ipfs/` for a local node. For remote reads, keep the blocks pinned on an available IPFS node and use a compatible HTTPS gateway. The demo hashes both gateway and bundled responses before exposing the article body to the reader or model.

`node --test demo/core.test.mjs` runs the retrieval, CID, fallback, and ranking checks. On the project-authored benchmark, the expected article ranked first in **12/12 queries** across **8 seed articles**. All eight blocks also returned byte-for-byte over the local Kubo gateway. The benchmark evaluates retrieval, and generated answer quality needs separate measurement.

## Question-answer tests

The seed catalog includes four clearly labeled fictional test articles for Riverlight Library, Atlas Shuttle, Cedar Day Pass, and Cedar Weekly Pass. The suite checks cited definitions, locations, people, dates, times, prices, counts, frequency, duration, lists, reasons, procedures, rules, eligibility, comparisons, missing evidence, and model failure. The explicit comparison case quotes a sentence that already compares the two passes. Arithmetic and reasoning across multiple articles are outside the tested extraction support.

## Resume entry

**FactChain | React, Solidity, IPFS, JavaScript, RAG, Transformers.js**

- Extended a community article registry with on-device retrieval-augmented generation, retrieving the expected source first for **12/12 labeled queries** across an **8-article** benchmark.
- Implemented raw CIDv1 verification and verified fallback for unavailable gateway responses, validating **8/8 byte-identical reads** through a real Kubo gateway.

Original hackathon team: Parth Pawar, Krishna Chamarthy, and Bhavesh Chauhan.







