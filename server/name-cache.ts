// Lightweight in-memory cache mapping token symbols/names to contract addresses
// Scope: process-wide, ephemeral (persists until server restart)

type Entry = {
  address: string;
  symbol?: string | null;
  name?: string | null;
  lastSeen: number;
};

function normalize(key: string | null | undefined): string | null {
  if (!key) return null;
  return key.trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
}

class NameAddressCache {
  private map: Map<string, Entry> = new Map();
  private maxEntries = 1000;

  remember(address: string, symbol?: string | null, name?: string | null) {
    const now = Date.now();
    const entries: Array<[string, string | null]> = [
      [address, address],
      [symbol || '', normalize(symbol)],
      [name || '', normalize(name)],
    ];

    // Always store by address too (self map)
    this.map.set(address, { address, symbol, name, lastSeen: now });

    for (const [, key] of entries) {
      if (!key) continue;
      this.map.set(key, { address, symbol, name, lastSeen: now });
    }

    // Trim if over capacity (remove oldest)
    if (this.map.size > this.maxEntries) {
      const items = Array.from(this.map.entries());
      items.sort((a, b) => a[1].lastSeen - b[1].lastSeen);
      const toRemove = this.map.size - this.maxEntries;
      for (let i = 0; i < toRemove; i++) {
        this.map.delete(items[i][0]);
      }
    }
  }

  resolve(input: string): string | null {
    if (!input) return null;
    // If looks like address or stored raw
    const byRaw = this.map.get(input);
    if (byRaw) return byRaw.address;
    const key = normalize(input);
    if (!key) return null;
    const entry = this.map.get(key);
    return entry ? entry.address : null;
  }
}

export const nameCache = new NameAddressCache();
