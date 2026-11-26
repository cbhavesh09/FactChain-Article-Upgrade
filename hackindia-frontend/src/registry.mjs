export const pageSize = 10;

export async function readRegistryPage(registry, index, size = pageSize) {
  const [entries, count] = await registry.getArticlePage(index * size, size);
  return { entries: [...entries], total: Number(count) };
}

export async function readSearchEntries(registry) {
  // Browser-only search indexes a bounded recent window. Full-corpus search needs an indexer.
  if (import.meta.env?.VITE_PAGED_REGISTRY !== "true") return registry.getLeaderboard();
  const [entries] = await registry.getArticlePage(0, 50);
  return entries;
}

