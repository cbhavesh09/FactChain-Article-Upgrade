# FactChain

FactChain is an article registry built by Team Enroll-X at HackIndia Spark 6 in 2025. The React frontend connects to an Ethereum wallet. Article bodies live in IPFS, and a Solidity contract records the corresponding content identifiers, authors, and vote totals. The React app ranks on-chain titles and answers questions using the matching IPFS article bodies.

## How it works

| Flow | Implementation |
| --- | --- |
| Connect | The frontend checks the wallet network and confirms that the configured contract address has deployed code. |
| Submit | The frontend adds the article JSON to IPFS, then sends one transaction to the article registry with the title and CID. |
| Search | The frontend ranks on-chain titles, streams matching content from IPFS, and displays the source-grounded answer above the articles. |
| Leaderboard | The contract exposes rankings by upvote ratio. Connected wallets can vote from the leaderboard. |

The frontend uses `ArticleLeaderboard` as its registry. The separate `ArticleManager` contract is preserved as part of the hackathon prototype. Articles stored only in `ArticleManager` require migration before they appear in the current frontend. The graph explorer and staking are outside the current UI. Community votes express opinion. Content identifiers verify content integrity, and continued availability depends on pinning.

## Run locally

Use Node.js 22, an Ethereum browser wallet, and a local Kubo daemon.

1. In `factchain copy`, run `npm ci`, then `npx hardhat node`. In a second terminal in that folder, deploy with `npx hardhat run scripts/deployLeaderboard.js --network localhost`. Save the returned address.
2. Start the local Kubo API on port 5001 and allow requests from `http://localhost:5173` in its CORS configuration. Keep the Kubo administrative API bound to loopback.
3. To load the demo articles into the local registry, set `$env:FACTCHAIN_CONTRACT_ADDRESS` to the deployed address, then run `npx hardhat run scripts/seedArticles.js --network localhost` from `factchain copy`. This pins article bodies in local Kubo and registers their CIDs on the local chain.
4. In `hackindia-frontend`, copy `.env.example` to `.env.local` and set `VITE_LEADERBOARD_ADDRESS` to the deployed address. The optional `VITE_READ_RPC_URL` defaults to the local RPC in the example file. It enables searching and reading the leaderboard before connecting a wallet. Contribution and voting require a connected wallet. Run `npm ci` and `npm run dev`.
5. Connect a development wallet to the local Hardhat network on chain ID 31337. Use a funded local development account. Search for **When did Riverlight Library open** after seeding. Then submit an article and confirm it appears in search and the leaderboard.

If Vite cannot bundle its configuration in a restricted workspace, use `npm run build -- --configLoader runner` followed by `npm run preview -- --configLoader runner --host 127.0.0.1 --port 5173`. Use the same app origin in Kubo CORS settings.

Run `npm run lint` and `npm run build` from `hackindia-frontend`, and `npx hardhat test` from `factchain copy`.

## Public demo deployment

GitHub Pages can serve the frontend of a public repository. In Settings → Pages select GitHub Actions. The included workflow publishes the static sample demo when no contract is configured. For the wallet-backed build:

1. Deploy the updated ArticleLeaderboard contract to Sepolia. Set SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in the deploy terminal, fund the test account with test ETH, then run `npx hardhat run scripts/deployLeaderboard.js --network sepolia`. The local seed script is restricted to localhost.
2. Set the repository Actions variables FACTCHAIN_CONTRACT_ADDRESS, FACTCHAIN_READ_RPC_URL, and FACTCHAIN_IPFS_GATEWAY_URL. Use an HTTPS RPC URL that supports browser access and an HTTPS gateway base ending in /ipfs. Use a dependable pinning arrangement for every article and image you expect a public visitor to read. These variables become public browser configuration.
3. For public publishing, set FACTCHAIN_IPFS_API_URL to an HTTPS upload endpoint that accepts Kubo-compatible add requests, pins uploads, permits your site's origin, and enforces upload limits. Keep upstream pinning credentials server-side. If you omit this variable, the browser can register an already-pinned article CID after verifying that the gateway can read it. To include an image, pin the image and upload an article JSON document with body and image fields. The image object uses cid, type, and alt fields.
4. Run Publish FactChain from GitHub Actions. Check the home page, a direct search link, the leaderboard, and random fact from the deployed URL. The Pages build uses hash routes to support direct navigation on static hosting.

The Solidity page reader caps responses at 50 records. The leaderboard fetches 10 per page and orders that page by vote ratio. A global ranking across millions of articles would require a separate indexer. The main app searches the latest 50 items in the paged registry plus any configured legacy registry. The browser-only app does not run a full-corpus index.

The optional VITE_LEGACY_LEADERBOARD_ADDRESS points to the original registry on the same chain. The leaderboard can browse it, and search can find its articles. Publishing and voting in the current app target the new registry. The contract caps page size and removes voted-out entries in constant time. The paged view reflects the current registry and can shift as facts are added or removed.

## Resume entry

**FactChain � HackIndia Spark 6 (Team Enroll-X)** - React, ethers.js, Solidity, Hardhat, IPFS, Flask

> Contributed to a hackathon article registry that stores article content on IPFS and records content identifiers on Ethereum, with keyword search and an on-chain leaderboard.

Use contribution-specific wording once you can identify which features you personally implemented.

## Team

Parth Pawar, Krishna Chamarthy, and Bhavesh Chauhan.




## Testnet staking and weekly rewards

Deploy `scripts/deployStakedLeaderboard.js` instead of the standard deploy script and set `VITE_STAKED_REGISTRY=true` for local builds. For the GitHub Pages workflow, set the repository variable `FACTCHAIN_STAKED_REGISTRY=true`. The staking registry constructor restricts deployment to Hardhat (31337) or Sepolia (11155111). Existing registries keep their original posts and vote history. Set `VITE_LEGACY_LEADERBOARD_ADDRESS` and, if needed, `VITE_OLDER_LEADERBOARD_ADDRESS` for access to older articles.

- Publishing escrows 0.02 test ETH for seven days. Each wallet gets one vote per fact, and authors cannot vote on their own facts. Voting closes at the review deadline.
- Anyone can settle an expired review. Five or more votes and at least two-thirds downvotes remove the article from the registry and move the stake to the current weekly pool. Other outcomes credit the author for withdrawal.
- The weekly ranking tracks votes received by each author during a seven-day UTC epoch bucket. Eligibility requires at least three upvotes and more upvotes than downvotes. Approval ratio wins, with upvote count and wallet address as deterministic tiebreakers.
- After the week closes, anyone can finalize in batches of up to 50 authors. Three eligible winners receive 50%, 30%, and 20%. Shares for empty slots go to first place. A pool with no eligible winners carries forward to the current week. Recipients withdraw their credits themselves.
- Wallet identity limits duplicate votes from one address. Users with multiple wallets can still influence results. Treat moderation outcomes as votes, and keep this prototype on test networks. No automated keeper is required. Settlement and batch finalization require transactions.

Search prioritizes images attached to the highest-ranked source and deduplicates attachments by CID. The Taj Mahal includes two credited editorial photos from Wikimedia Commons. The gallery keeps additional images collapsed by default.

