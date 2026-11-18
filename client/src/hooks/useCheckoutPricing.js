import { useCallback, useEffect, useRef, useState } from "react";
import { checkoutService } from "../services/api";

/**
 * The basket's price for an address and delivery choice, always asked from the server (it is the only place
 * that calculates delivery, discounts and GST). Re-asks whenever an input changes, drops answers that arrive
 * out of order, and says whether the answer on screen belongs to the inputs currently on screen, so checkout
 * can refuse to submit a stale total.
 *
 * `request` is null until there is something to price (items and a state).
 */
export const useCheckoutPricing = (request, { debounceMs = 350 } = {}) => {
  const key = request ? JSON.stringify(request) : "";
  const [state, setState] = useState({ status: "idle", data: null, key: "", error: "" });
  const [tick, setTick] = useState(0); // bump to force a fresh calculation
  const latest = useRef(0);

  useEffect(() => {
    if (!key) {
      setState({ status: "idle", data: null, key: "", error: "" });
      return undefined;
    }
    const id = ++latest.current;
    setState((prev) => ({ ...prev, status: "loading" }));
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await checkoutService.price(JSON.parse(key), { signal: controller.signal });
        if (id === latest.current) setState({ status: "ready", data, key, error: "" });
      } catch (err) {
        if (err.name === "AbortError" || id !== latest.current) return;
        setState((prev) => ({ status: "error", data: prev.data, key: "", error: err.message || "We couldn't calculate your total." }));
      }
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, tick, debounceMs]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  const isCurrent = state.status === "ready" && state.key === key && key !== "";
  return { ...state, isCurrent, isLoading: state.status === "loading", refresh };
};
