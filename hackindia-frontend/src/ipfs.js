import { create } from "ipfs-http-client";

const api = import.meta.env.VITE_IPFS_API_URL;
const gateway = import.meta.env.VITE_IPFS_GATEWAY_URL;
export const imageLimit = 4 * 1024 * 1024;
export const imageTypes = ["image/jpeg", "image/png", "image/webp"];
export const canPublish = Boolean(api || !gateway);

const client = canPublish ? create({
  url: api || "http://127.0.0.1:5001/api/v0",
  timeout: 15000,
}) : null;

export async function pinFile(file) {
  if (!api) return (await client.add(file, { pin: true })).cid.toString();
  const body = new FormData();
  body.set("file", file, file.name);
  const response = await fetch(api.replace(/\/$/, "") + "/add?pin=true", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.Hash) {
    throw new Error(result?.Message || `IPFS upload failed (HTTP ${response.status}).`);
  }
  return result.Hash;
}

async function* readChunks(cid, signal) {
  if (!/^[a-zA-Z0-9]{20,120}$/.test(cid)) throw new Error("Invalid IPFS CID.");
  if (!gateway) {
    yield* client.cat(cid, { signal });
    return;
  }
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(gateway.replace(/\/$/, "") + "/" + cid, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok || !response.body) throw new Error("IPFS gateway could not read this CID.");
  yield* response.body;
}

async function readBlob(cid, limit, type, signal) {
  const chunks = [];
  let size = 0;
  for await (const chunk of readChunks(cid, signal)) {
    size += chunk.length;
    if (size > limit) throw new Error("IPFS content exceeds the supported size.");
    chunks.push(chunk);
  }
  return new Blob(chunks, { type });
}

export async function readArticle(cid, signal) {
  const content = await (await readBlob(cid, 64 * 1024, "text/plain", signal)).text();
  try {
    const article = JSON.parse(content);
    if (typeof article?.body === "string") {
      const image = imageTypes.includes(article.image?.type) && typeof article.image.cid === "string"
        ? article.image
        : null;
      return { body: article.body, image };
    }
  } catch {
    // The original registry also contains plain-text articles.
  }
  return { body: content, image: null };
}

export function readImage(image, signal) {
  if (!imageTypes.includes(image.type)) throw new Error("Unsupported image format.");
  return readBlob(image.cid, imageLimit, image.type, signal);
}

export default client;
