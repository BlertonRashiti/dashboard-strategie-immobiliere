const keyOf = (s) => `${s.adresse}|${s.commune ?? ''}`.toLowerCase();

async function query(text) {
  const url = `${GEO.searchUrl}?${new URLSearchParams({
    searchText: text,
    type: 'locations',
    origins: 'address,gazetteer',
    sr: '4326',
    limit: '1',
  })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geo.admin ${res.status}`);
  const hit = (await res.json()).results?.[0]?.attrs;
  return hit && typeof hit.lat === 'number' ? { lat: hit.lat, lon: hit.lon } : null;
}

/** Géocode les sites (cache IndexedDB). Retourne Map(siteId → {lat, lon}). */
async function geocodeSites(sites, { onProgress, signal } = {}) {
  const out = new Map();
  let done = 0;
  for (const s of sites) {
    if (signal?.aborted) break;
    done++;
    if (!s.adresse) continue;
    const key = keyOf(s);
    let entry = await getGeo(key);
    if (!entry) {
      let hit = null;
      try {
        hit = await query(`${s.adresse} ${s.commune ?? GEO.defaultLocality}`);
        if (!hit && s.commune) hit = await query(s.adresse);
      } catch (e) {
        onProgress?.(done, sites.length, e);
        continue;
      }
      entry = { key, ...(hit ?? { lat: null, lon: null }), at: Date.now() };
      await putGeo(entry);
      await new Promise((r) => setTimeout(r, GEO.delayMs));
    }
    if (entry.lat !== null) out.set(s.id, { lat: entry.lat, lon: entry.lon });
    onProgress?.(done, sites.length);
  }
  return out;
}

async function cachedCoords(sites) {
  const out = new Map();
  for (const s of sites) {
    if (!s.adresse) continue;
    const e = await getGeo(keyOf(s));
    if (e && e.lat !== null) out.set(s.id, { lat: e.lat, lon: e.lon });
  }
  return out;
}
