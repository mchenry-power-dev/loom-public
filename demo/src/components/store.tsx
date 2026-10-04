import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { demoReducer } from "../domain/reducer";
import { createDemoStorage } from "../persistence";
import type { DemoAction, DemoState } from "../domain/model";
type Toast = { message: string; action?: { label: string; run: () => void } };
type Context = {
  state: DemoState;
  dispatch: (action: DemoAction) => boolean;
  notify: (message: string, action?: Toast["action"]) => void;
  toast: Toast | null;
  dismissToast: () => void;
  storageMessage: string;
  reloadStorage: () => void;
};
const Context = createContext<Context>(null!);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [storage] = useState(() => createDemoStorage());
  const [initial] = useState(() => storage.load());
  const [state, setState] = useState(initial.state);
  const stateRef = useRef(state);
  const sessionOnly = useRef(initial.status === "session");
  const [toast, setToast] = useState<Toast | null>(null);
  const [storageMessage, setStorageMessage] = useState(initial.message || "");
  function reloadStorage() {
    // Reload every mounted editor together. Dirty forms keep their native
    // beforeunload confirmation rather than silently reusing a stale draft.
    location.reload();
  }
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key === storage.key)
        setStorageMessage(
          "Another tab changed this demo. Load its saved state before making further edits. Your open forms have not been replaced.",
        );
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [storage]);
  function dispatch(action: DemoAction) {
    const before = stateRef.current;
    const next = demoReducer(before, action);
    if (next === before) return false;
    if (next.revision !== before.revision) {
      const result = storage.save({ ...next, scheduleProposal: null });
      if (result.status === "conflict" || result.status === "invalid") {
        setStorageMessage(result.message);
        setToast({ message: result.message });
        return false;
      }
      if (result.status === "session") {
        sessionOnly.current = true;
        setStorageMessage(result.message);
      }
    }
    stateRef.current = next;
    setState(next);
    return true;
  }
  return (
    <Context.Provider
      value={{
        state,
        dispatch,
        toast,
        notify: (message, action) =>
          setToast({
            message:
              sessionOnly.current &&
              /saved|applied|updated|added/i.test(message)
                ? `${message} Session only; this change will not persist after closing the tab.`
                : message,
            action,
          }),
        dismissToast: () => setToast(null),
        storageMessage,
        reloadStorage,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useDemo = () => useContext(Context);
