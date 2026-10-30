/**
 * Tiny request cache for read-only API calls that many components ask for at once
 * (categories, collections, ...). Concurrent callers share one in-flight request, and a
 * successful result is reused for `ttlMs`. A fetcher returns `{ value, cacheable }`: results that
 * came from a failed request or the localStorage fallback are `cacheable: false`, so they are
 * shared with callers already waiting but never served later.
 */
const entries = new Map();

const copy = (value) => (Array.isArray(value) ? [...value] : value);

export const cached = (key, fetcher, ttlMs = 30000) => {
  const hit = entries.get(key);
  if (hit && (hit.pending || hit.expires > Date.now())) return hit.promise.then(copy);

  const entry = { pending: true, expires: 0 };
  entry.promise = Promise.resolve()
    .then(fetcher)
    .then(
      ({ value, cacheable }) => {
        entry.pending = false;
        if (cacheable) entry.expires = Date.now() + ttlMs;
        else if (entries.get(key) === entry) entries.delete(key);
        return value;
      },
      (error) => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      }
    );
  entries.set(key, entry);
  return entry.promise.then(copy);
};

/** Drops cached entries whose key starts with `prefix` (all of them when omitted). */
export const invalidateCache = (prefix = "") => {
  for (const key of [...entries.keys()]) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
};
