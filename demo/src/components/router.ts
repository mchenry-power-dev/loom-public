import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const HISTORY_KEY = "loomPublicDemoRouteIndex";
let currentRoute = location.hash.slice(1) || "/orders";
let currentIndex = Number(history.state?.[HISTORY_KEY]) || 0;
history.replaceState({ ...history.state, [HISTORY_KEY]: currentIndex }, "");
let blocker: ((destination: string) => void) | null = null;
let pending: { path: string; index?: number } | null = null;
let restoring = false;
let acceptNextPop = false;
let discardAfterRestore = false;
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((callback) => callback());

function commitPending() {
  if (!pending) return;
  if (restoring) {
    discardAfterRestore = true;
    return;
  }
  const target = pending;
  pending = null;
  if (target.index !== undefined) {
    acceptNextPop = true;
    history.go(target.index - currentIndex);
  } else commitPush(target.path);
}
function commitPush(path: string) {
  if (path === currentRoute) return;
  currentIndex += 1;
  history.pushState({ [HISTORY_KEY]: currentIndex }, "", `#${path}`);
  currentRoute = path;
  notify();
}
function onHistoryChange() {
  const path = location.hash.slice(1) || "/orders";
  const storedIndex = history.state?.[HISTORY_KEY];
  if (restoring) {
    // A traversal can emit both popstate and hashchange before history.go restores
    // the current entry. Ignore the duplicate event instead of restoring twice.
    if (path !== currentRoute) return;
    restoring = false;
    if (discardAfterRestore) {
      discardAfterRestore = false;
      commitPending();
    }
    return;
  }
  if (path === currentRoute) return;
  const index =
    typeof storedIndex === "number" ? storedIndex : currentIndex + 1;
  if (typeof storedIndex !== "number") {
    history.replaceState({ ...history.state, [HISTORY_KEY]: index }, "");
  }
  if (blocker && !acceptNextPop && index !== currentIndex) {
    pending = { path, index };
    restoring = true;
    history.go(currentIndex - index);
    blocker(path);
    return;
  }
  acceptNextPop = false;
  currentIndex = index;
  currentRoute = path;
  notify();
}
function interceptLink(event: MouseEvent) {
  const target = (event.target as Element).closest?.("a[href]");
  const href = target?.getAttribute("href");
  if (
    !href?.startsWith("#/") ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  )
    return;
  event.preventDefault();
  navigate(href.slice(1));
}
function subscribe(callback: () => void) {
  if (!subscribers.size) {
    window.addEventListener("popstate", onHistoryChange);
    window.addEventListener("hashchange", onHistoryChange);
    document.addEventListener("click", interceptLink, true);
  }
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
    if (!subscribers.size) {
      window.removeEventListener("popstate", onHistoryChange);
      window.removeEventListener("hashchange", onHistoryChange);
      document.removeEventListener("click", interceptLink, true);
    }
  };
}
/** Shared history preserves the original Back/Forward entries when an edit blocks navigation. */
export function useRoute() {
  return useSyncExternalStore(subscribe, () => currentRoute);
}
export function navigate(path: string) {
  if (path === currentRoute) return;
  if (blocker) {
    pending = { path };
    blocker(path);
    return;
  }
  commitPush(path);
}
export function useUnsavedChanges(dirty: boolean) {
  const [destination, setDestination] = useState<string | null>(null);
  const guardRef = useRef<((path: string) => void) | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const guard = (path: string) => setDestination(path);
    guardRef.current = guard;
    blocker = guard;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      if (blocker === guard) blocker = null;
      if (guardRef.current === guard) guardRef.current = null;
      window.removeEventListener("beforeunload", unload);
    };
  }, [dirty]);
  return {
    pending: destination,
    cancel: () => {
      pending = null;
      setDestination(null);
    },
    discard: () => {
      // Route publication is synchronous; remove this editor's blocker before
      // notifying subscribers so a rapid next navigation cannot reach an orphan.
      if (blocker === guardRef.current) blocker = null;
      commitPending();
      setDestination(null);
    },
  };
}
