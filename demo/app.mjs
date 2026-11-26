import { retrieve, rawCid, loadVerified, generateAnswer, rankArticles, voteCounts } from "./core.mjs";

const select = selector => document.querySelector(selector);
const queryInput = select("#query");
const status = select("#status");
const sources = select("#sources");
const generation = select("#generation");
const answer = select("#answer");
const storageKey = "factchain-articles-v1";
let state = JSON.parse(localStorage.getItem(storageKey) || '{"articles":[],"votes":{}}');
let search;

const catalog = fetch("./corpus/index.json", { cache: "no-cache" }).then(response => {
  if (!response.ok) throw new Error("Could not load the article catalog.");
  return response.json();
});

function save(next) {
  localStorage.setItem(storageKey, JSON.stringify(next));
  state = next;
}

function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

async function allArticles() {
  return [...await catalog, ...state.articles];
}

function gatewayUrl() {
  const value = select("#gateway").value.trim();
  if (!value) return "";
  const url = new URL(value);
  const loopback = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((!loopback && url.protocol !== "https:") || !url.pathname.endsWith("/ipfs/") || url.search || url.hash || url.username || url.password) {
    throw new Error("Enter an HTTPS or loopback gateway URL ending in /ipfs/.");
  }
  return url;
}

function makeArticle(item, index) {
  const card = element("article", "");
  const provenance = element("p", item.source + " · ");
  provenance.append(element("code", item.cid));
  const heading = element("h2", `[${index + 1}] ${item.title}`);
  const votes = element("div", "");
  const counts = element("span", "");
  const up = element("button", "Upvote");
  const down = element("button", "Downvote");
  function refresh() {
    const { likes, dislikes } = voteCounts(item, state.votes);
    counts.textContent = `${likes} up · ${dislikes} down`;
    up.setAttribute("aria-pressed", String(state.votes[item.id] === 1));
    down.setAttribute("aria-pressed", String(state.votes[item.id] === -1));
  }
  function vote(direction) {
    try {
      const votes = { ...state.votes };
      if (votes[item.id] === direction) delete votes[item.id];
      else votes[item.id] = direction;
      save({ ...state, votes });
      refresh();
    } catch {
      status.textContent = "Your vote could not be saved in this browser.";
    }
  }
  up.addEventListener("click", () => vote(1));
  down.addEventListener("click", () => vote(-1));
  refresh();
  votes.className = "votes";
  votes.append(up, down, counts);
  card.append(heading, element("p", "By " + item.author), element("p", item.text), provenance, votes);
  return card;
}

async function explore() {
  search?.abort();
  search = new AbortController();
  const { signal } = search;
  const query = queryInput.value.trim();
  generation.hidden = true;
  answer.textContent = "";
  sources.replaceChildren();
  status.textContent = "Verifying articles…";
  try {
    const gateway = gatewayUrl();
    const articles = await allArticles();
    const matches = query ? retrieve(articles, query) : articles;
    const results = await Promise.allSettled(matches.map(item => loadVerified(item, { gateway, signal })));
    if (signal.aborted) return;
    const verified = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    status.textContent = matches.length ? `${verified.length} of ${matches.length} articles verified.` : "No matching articles.";
    verified.forEach((item, index) => sources.append(makeArticle(item, index)));
    if (!query || !verified.length) return;
    generation.hidden = false;
    answer.textContent = "Preparing the answer…";
    try {
      const text = await generateAnswer(query, verified, signal, loaded => {
        if (!signal.aborted) answer.textContent = loaded === null ? "Generating an answer…" : `Loading model weights… ${Math.round(loaded * 100)}%`;
      });
      if (!signal.aborted) answer.textContent = text;
    } catch (error) {
      if (!signal.aborted) answer.textContent = error.message;
    }
  } catch (error) {
    if (!signal.aborted) status.textContent = error.message;
  }
}

async function open(view) {
  document.querySelectorAll("[data-view]").forEach(button => {
    const active = button.dataset.view === view;
    button.setAttribute("aria-pressed", String(active));
    select("#" + button.dataset.view).hidden = !active;
  });
  if (view === "explore") await explore();
  else search?.abort();
  if (view === "leaderboard") {
    try {
      const entries = rankArticles(await allArticles(), state.votes);
      select("#rankings").replaceChildren(...entries.map(item => element("li", `${item.title} · ${item.likes} up · ${item.dislikes} down · ${Math.round(item.ratio * 100)}% positive`)));
    } catch (error) {
      select("#rankings").replaceChildren(element("li", error.message));
    }
  }
}

document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => open(button.dataset.view)));
select("#search").addEventListener("submit", event => {
  event.preventDefault();
  explore();
});

select("#publish").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = select("#publish-status");
  const submit = form.querySelector("button");
  const [title, author, tags, body] = ["title", "author", "tags", "body"].map(id => select("#" + id).value.trim());
  if (!title || !author || !body) {
    message.textContent = "Enter a title, a display name, and article text.";
    return;
  }
  submit.disabled = true;
  try {
    const cid = await rawCid(new TextEncoder().encode(body));
    const item = { id: crypto.randomUUID(), title, author, tags, body, cid, likes: 0, dislikes: 0 };
    save({ ...state, articles: [item, ...state.articles] });
    form.reset();
    message.textContent = "Article saved in this browser. CID: " + cid;
    queryInput.value = "";
    await open("explore");
  } catch {
    message.textContent = "This browser could not save your article.";
  } finally {
    submit.disabled = false;
  }
});

open("explore");


