import { lazy } from "react";

const RELOAD_FLAG = "divyam_chunk_reload";

/**
 * React.lazy for a route component exported by name. If the chunk can't be fetched (typically
 * a stale tab after a new deploy replaced the hashed files) the page is reloaded once to pick up
 * the new build; a second failure is thrown so the ErrorBoundary can show it.
 */
export const lazyPage = (loader, exportName) =>
  lazy(() =>
    loader().then(
      (module) => {
        try {
          sessionStorage.removeItem(RELOAD_FLAG);
        } catch {
          // storage unavailable
        }
        return { default: module[exportName] };
      },
      (error) => {
        let alreadyRetried = true;
        try {
          alreadyRetried = sessionStorage.getItem(RELOAD_FLAG) === "1";
          if (!alreadyRetried) sessionStorage.setItem(RELOAD_FLAG, "1");
        } catch {
          // storage unavailable: don't loop reloads
        }
        if (alreadyRetried) throw error;
        window.location.reload();
        return new Promise(() => {});
      }
    )
  );
