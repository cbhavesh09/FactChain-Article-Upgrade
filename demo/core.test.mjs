import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { retrieve, rawCid, loadVerified, generateAnswer, rankArticles } from "./core.mjs";

const index = JSON.parse(await readFile(new URL("./corpus/index.json", import.meta.url)));
const block = record => readFile(new URL("./corpus/" + record.cid + ".txt", import.meta.url));
const cases = [
  ["What is an IPFS CID?", "cid"],
  ["Verify raw hash content addressing", "cid"],
  ["Why pin IPFS data before garbage collection?", "pinning"],
  ["Can gateway find content without pinning?", "pinning"],
  ["Merkle inclusion proof root hash", "merkle"],
  ["What does blockchain consensus decide?", "consensus"],
  ["validator consensus transaction order", "consensus"],
  ["How does retrieval augmented generation use source context?", "rag"],
  ["ETag conditional HTTP cache 304", "etag"],
  ["Use idempotency keys to avoid duplicate payment requests", "idempotency"],
  ["What do community votes tell you about credibility?", "reviews"],
  ["What is the IF None Match response for a matching ETag?", "etag"],
];

test("all 13 bundled blocks match the published raw CIDs", async () => {
  assert.equal(index.length, 13);
  for (const record of index) assert.equal(await rawCid(await block(record)), record.cid);
});

test("report retrieval quality on labeled article queries", () => {
  let top1 = 0;
  let top3 = 0;
  for (const [question, expected] of cases) {
    const results = retrieve(index, question);
    if (results[0]?.id === expected) top1++;
    if (results.some(record => record.id === expected)) top3++;
  }
  console.log(`Retrieval: top-1 ${top1}/${cases.length}; top-3 ${top3}/${cases.length}`);
  assert.ok(top1 >= 10);
  assert.equal(top3, cases.length);
  assert.deepEqual(retrieve(index, "how to bake a cake"), []);
});

test("valid gateway bytes take precedence", async () => {
  const record = index[0];
  const bytes = await block(record);
  const result = await loadVerified(record, {
    gateway: "https://gateway.example/ipfs/",
    fetcher: async url => {
      assert.equal(url.pathname, "/ipfs/" + record.cid);
      assert.equal(url.searchParams.get("format"), "raw");
      return new Response(bytes);
    },
  });
  assert.equal(result.source, "IPFS gateway");
});

test("corruption at the gateway triggers a verified fallback", async () => {
  const record = index[0];
  const bytes = await block(record);
  const gateway = "https://gateway.example/ipfs/";
  const result = await loadVerified(record, {
    gateway,
    fetcher: async url => new Response(url instanceof URL ? "changed" : bytes),
  });
  assert.equal(result.source, "Bundled block");
});

test("reject corrupt bytes when every source fails verification", async () => {
  await assert.rejects(loadVerified(index[0], { fetcher: async () => new Response("changed") }), /No verified copy/);
});

test("the empty raw IPFS block has its known CID", async () => {
  assert.equal(await rawCid(new Uint8Array()), "bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");
});



test("local articles are verified against their CID and can enter the leaderboard", async () => {
  const body = "Original article body";
  const cid = await rawCid(new TextEncoder().encode(body));
  const article = { id: "local", title: "An article", body, cid, likes: 0, dislikes: 0 };
  assert.equal((await loadVerified(article)).source, "Browser storage");
  await assert.rejects(loadVerified({ ...article, body: "altered" }), /does not match/);
  const [first] = rankArticles([article, ...index], { local: 1, merkle: -1 });
  assert.equal(first.id, "local");
  assert.equal(first.likes, 1);
});



test("an explicit location is answered even when the model is blocked", async () => {
  const previousWorker = globalThis.Worker;
  globalThis.Worker = class {
    constructor() { throw new Error("Worker blocked"); }
  };
  try {
    const response = await generateAnswer("Where is the Taj Mahal?", [
      { title: "Taj Mahal", text: "The Taj Mahal is a marble mausoleum. The Taj Mahal is in Agra, India." },
    ]);
    assert.equal(response, "The Taj Mahal is in Agra, India. [1]");
  } finally {
    globalThis.Worker = previousWorker;
  }
});


test("What is IPFS returns a cited definition from the matching article", async () => {
  const [match] = retrieve(index, "What is IPFS?");
  assert.equal(match.id, "ipfs");
  const text = (await block(match)).toString();
  assert.equal(await generateAnswer("What is IPFS?", [{ ...match, text }]),
    "IPFS (InterPlanetary File System) is a peer-to-peer protocol for storing and retrieving files by their content. [1]");
});


const answerCases = [
  ["What is Riverlight Library?", /reading and lending center/],
  ["Where is Riverlight Library?", /Cedar Square/],
  ["Who founded Riverlight Library?", /Asha Patel/],
  ["When did Riverlight Library open?", /14 March 2024/],
  ["What time does Riverlight Library close?", /6:00 PM/],
  ["How many books does Riverlight Library have?", /4,200 books/],
  ["How much does Riverlight Library charge for adult membership?", /₹300 per year/],
  ["Why does Riverlight Library provide a wheelchair ramp?", /make the entrance accessible/],
  ["How do I register for Riverlight Library membership?", /photo ID and complete the form/],
  ["Who operates Atlas Shuttle?", /Cedar Transit/],
  ["List Atlas Shuttle stops", /North Station, Museum Road, and Central Park/],
  ["How many passengers can Atlas Shuttle seat?", /24 passengers/],
  ["How often does Atlas Shuttle depart?", /every 30 minutes/],
  ["Does Atlas Shuttle allow bicycles?", /does not allow bicycles/],
  ["Does Atlas Shuttle run on Sundays?", /does not run on Sundays/],
  ["When does Cedar Day Pass expire?", /midnight on the day of purchase/],
  ["How much does Cedar Day Pass cost?", /₹80/],
  ["Can students buy Cedar Day Pass?", /same price as other riders/],
  ["Can I get a refund for Cedar Day Pass?", /before the first ride/],
  ["How long is Cedar Weekly Pass valid?", /seven consecutive days/],
  ["How do I renew Cedar Weekly Pass?", /station kiosk/],
  ["Compare Cedar Weekly Pass and Cedar Day Pass", /seven days while the Cedar Day Pass is valid for one day/],
  ["Where is Atlas Shuttle headquartered?", /^I could not find a direct answer/],
  ["When did Riverlight Library move?", /^I could not find a direct answer/],
  ["How many computers does Riverlight Library have?", /^I could not find a direct answer/],
  ["Who wrote the Cedar Day Pass policy?", /^I could not find a direct answer/],
  ["What is the surface temperature of Venus?", /^No verified articles/],
  ["How much more does Cedar Weekly Pass cost than Cedar Day Pass?", /^FactChain can quote/],
  ["Calculate the total for two Cedar Day Pass tickets", /^FactChain can quote/],
];

for (const [query, expected] of answerCases) {
  test(query, async () => {
    const sources = await Promise.all(retrieve(index, query).map(async record => {
      const bytes = await block(record);
      return loadVerified(record, { fetcher: async () => new Response(bytes) });
    }));
    const answer = await generateAnswer(query, sources);
    assert.match(answer, expected);
    if (!expected.source.startsWith("^")) {
      const citation = answer.match(/\[(\d+)\]$/);
      assert.ok(citation && sources[Number(citation[1]) - 1]?.text.includes(answer.slice(0, citation.index).trim()));
    }
  });
}

test("an unavailable model leaves a labeled excerpt for an open-ended request", async () => {
  const prior = globalThis.Worker;
  globalThis.Worker = class { constructor() { throw new Error("Worker blocked"); } };
  try {
    const article = { title: "Riverlight Library", text: "Riverlight Library has 4,200 books." };
    assert.equal(await generateAnswer("Summarize Riverlight Library", [article]),
      "AI model unavailable. Source excerpt [1]\nRiverlight Library has 4,200 books.");
  } finally {
    globalThis.Worker = prior;
  }
});

test("a canceled question does not produce an answer", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(generateAnswer("What is IPFS?", [], controller.signal), { name: "AbortError" });
});


test("Riverlight opening date resolves directly without punctuation", async () => {
  const [record] = retrieve(index, "When did Riverlight Library open");
  const text = (await block(record)).toString();
  assert.equal(await generateAnswer("When did Riverlight Library open", [{ ...record, text }]),
    "14 March 2024 [1]");
});

test("different opening dates retain both source citations", async () => {
  const subject = "Riverlight Library";
  const sources = ["14 March 2024", "15 March 2024"].map(date => ({
    title: subject, text: `${subject} opened on ${date}.`,
  }));
  assert.equal(await generateAnswer("When did Riverlight Library open?", sources),
    "The articles give different opening dates: 14 March 2024 [1], 15 March 2024 [2].");
});

test("search finds a published fact by article text even when the title has no matching terms", () => {
  const records = [
    { id: "unrelated", title: "A different entry", body: "The garden needs water." },
    { id: "published", title: "My day", body: "I visited the Golden Temple in Amritsar." },
  ];
  assert.equal(retrieve(records, "Golden Temple Amritsar")[0]?.id, "published");
  assert.equal(retrieve(records, "My day")[0]?.id, "published");
});

test("Is Bhavesh a student uses a direct assertion and ignores unrelated students", async () => {
  const query = "Is Bhavesh a student?";
  const distractor = { title: "Other student", text: "Asha is a student." };
  assert.match(await generateAnswer(query, [distractor]), /^I could not find/);
  assert.equal(await generateAnswer(query, [
    distractor, { title: "Profile", text: "Bhavesh is a student." },
  ]), "Yes. Bhavesh is a student. [2]");
  assert.equal(await generateAnswer(query, [
    { title: "Profile", text: "Bhavesh is not a student." },
  ]), "No. Bhavesh is not a student. [1]");
});

test("location is found in a description after a pronunciation note", async () => {
  const article = {
    title: "Taj Mahal",
    text: "The Taj Mahal (pronunciation: [mə(h)əl]; lit. Crown of the Palace) is an ivory-white marble mausoleum on the right bank of the river Yamuna in Agra, Uttar Pradesh, India. It was commissioned in 1631.",
  };
  const answer = await generateAnswer("Where is the taj mahal", [article]);
  assert.match(answer, /Agra, Uttar Pradesh, India\. \[1\]$/);
});

