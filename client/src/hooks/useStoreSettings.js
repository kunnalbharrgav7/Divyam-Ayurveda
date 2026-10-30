import { useCallback, useEffect, useState } from "react";
import { settingsService } from "../services/api";

// Every component on a page shares one request (and one copy) of the public settings
let current = null;
let inflight = null;
const listeners = new Set();

const publish = (value) => {
  current = value;
  listeners.forEach((fn) => fn(value));
};

const load = () => {
  if (!inflight) {
    inflight = settingsService
      .getPublic()
      .then((data) => {
        publish(data);
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

/** Called after an admin saves settings, so open storefront pages pick up the change. */
export const refreshStoreSettings = () => load().catch(() => {});

/**
 * Live store settings (contact details, payment options, shipping zones, GST, announcement) from the API.
 * `status` is "loading" until the first answer, then "ready" or, if the API could not be reached and
 * nothing was loaded before, "error". `settings` keeps the last good copy during a refresh.
 */
export const useStoreSettings = () => {
  const [settings, setSettings] = useState(current);
  const [status, setStatus] = useState(current ? "ready" : "loading");

  const fetchNow = useCallback(() => {
    if (!current) setStatus("loading");
    load()
      .then(() => setStatus("ready"))
      .catch(() => setStatus(current ? "ready" : "error"));
  }, []);

  useEffect(() => {
    const onChange = (value) => setSettings(value);
    listeners.add(onChange);
    fetchNow();
    return () => listeners.delete(onChange);
  }, [fetchNow]);

  return { settings, status, retry: fetchNow };
};
