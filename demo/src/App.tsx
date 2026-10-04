import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Home,
  ShoppingCart,
  Package,
  ChartNoAxesColumn,
  Settings,
  Scan,
  Search,
  Menu,
  X,
  CircleHelp,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { Button, Logo, IconButton, Modal, Panel, Tabs } from "./components/ui";
import { useRoute } from "./components/router";
import { useDemo } from "./components/store";
import Orders from "./routes/Orders";
const Products = lazy(() => import("./routes/Products"));
const Scheduling = lazy(() => import("./routes/Scheduling"));
const Analytics = lazy(() => import("./routes/Analytics"));
const Reports = lazy(() => import("./routes/Reports"));
const Automations = lazy(() => import("./routes/Automations"));
const Insights = lazy(() => import("./routes/Insights"));
const Supporting = lazy(() => import("./routes/Supporting"));
const NAV = [
  ["Home", "/home", Home],
  ["Orders & Activity", "/orders", ShoppingCart],
  ["Products", "/products", Package],
  ["Analytics", "/analytics", ChartNoAxesColumn],
  ["Integrations", "/integrations", Scan],
  ["Settings", "/settings", Settings],
] as const;
const ORDER_TABS = [
  ["Overview", "/orders"],
  ["Subscriptions", "/subscriptions"],
  ["Scheduling", "/scheduling"],
  ["Cancellations", "/cancellations"],
];
const ANALYTICS_TABS = [
  ["Overview", "/analytics"],
  ["Reports", "/reports"],
  ["Automations", "/automations"],
  ["Loom AI™", "/insights"],
];
export default function App() {
  const route = useRoute();
  const path = route.split("?")[0];
  const { state, storageMessage, toast, dismissToast, reloadStorage } =
    useDemo();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [help, setHelp] = useState(false);
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width:640px)").matches,
  );
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = matchMedia("(max-width:640px)");
    const resize = () => setMobile(media.matches);
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    if (!drawer || !mobile) return;
    const previous = document.activeElement as HTMLElement;
    const targets = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled)",
        ) || [],
      ).filter((el) => el.getClientRects().length > 0);
    targets()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      event.preventDefault();
      const items = targets();
      const index = items.indexOf(document.activeElement as HTMLElement);
      items[
        event.shiftKey
          ? index <= 0
            ? items.length - 1
            : index - 1
          : (index + 1) % items.length
      ]?.focus();
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [drawer, mobile]);
  const orderArea = [
    "/orders",
    "/subscriptions",
    "/scheduling",
    "/cancellations",
  ].some((p) => path.startsWith(p));
  const analyticsArea = [
    "/analytics",
    "/reports",
    "/automations",
    "/insights",
  ].some((p) => path.startsWith(p));
  const section = orderArea
    ? "/orders"
    : analyticsArea
      ? "/analytics"
      : path.startsWith("/products") || path.startsWith("/storefront")
        ? "/products"
        : path;
  const title = path.startsWith("/scheduling")
    ? "Scheduling"
    : path.startsWith("/products/")
      ? "Purchase Options"
      : path.startsWith("/products")
        ? "Products"
        : path.startsWith("/storefront")
          ? "Demo storefront"
          : analyticsArea
            ? "Analytics & Reporting"
            : orderArea
              ? "Orders & Activity"
              : path === "/home"
                ? "Welcome to Loom"
                : path === "/settings"
                  ? "Settings"
                  : "Integrations";
  useEffect(() => {
    setDrawer(false);
    setSearch(false);
    document.title = `${title} · Loom demo`;
    window.scrollTo({ top: 0 });
  }, [path, title]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const q = query.trim().toLowerCase();
  const results = q
    ? [
        ...state.orders
          .filter(
            (o) =>
              o.number.toLowerCase().includes(q) ||
              o.customer.toLowerCase().includes(q),
          )
          .slice(0, 5)
          .map((o) => ({
            name: o.number,
            kind: "Sample order",
            href: `#/orders/${o.id}`,
          })),
        ...state.products
          .filter((p) => p.name.toLowerCase().includes(q))
          .map((p) => ({
            name: p.name,
            kind: "Product",
            href: `#/products/${p.id}`,
          })),
        ...state.reports
          .filter((r) => r.name.toLowerCase().includes(q))
          .map((r) => ({
            name: r.name,
            kind: "Report",
            href: `#/reports/${r.id}`,
          })),
      ]
    : [];
  return (
    <div
      className={`app-shell ${state.preferences.compactRows ? "compact-rows" : ""} ${state.preferences.reducedMotion ? "reduce-motion" : ""}`}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to main content
      </a>
      {drawer && mobile && (
        <button
          className="drawer-backdrop"
          aria-label="Dismiss navigation backdrop"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        ref={sidebar}
        inert={mobile && !drawer}
        className={`sidebar ${drawer ? "open" : ""}`}
        role={mobile && drawer ? "dialog" : undefined}
        aria-modal={mobile && drawer ? true : undefined}
        aria-label="Main navigation"
      >
        <Logo />
        <IconButton
          icon={X}
          label="Close navigation"
          className="mobile-only mobile-close"
          onClick={() => setDrawer(false)}
        />
        <nav>
          {NAV.map(([label, href, Icon]) => (
            <a
              key={href}
              href={`#${href}`}
              onClick={() => setDrawer(false)}
              className={section === href ? "active" : ""}
              aria-current={section === href ? "page" : undefined}
            >
              <Icon size={21} />
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <h3>
            Grow recurring
            <br />
            revenue
          </h3>
          <p>
            Subscription operations
            <br />
            for modern brands.
          </p>
          <Button
            onClick={() => {
              setDrawer(false);
              setHelp(true);
            }}
          >
            <CircleHelp size={17} /> Ask Loom
          </Button>
        </div>
      </aside>
      <main className="main" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <IconButton
            icon={Menu}
            label="Open navigation"
            className="mobile-only"
            onClick={() => setDrawer(true)}
          />
          <div className="page-intro">
            <h1>{title}</h1>
            <p>
              {path === "/scheduling"
                ? "Plan fulfillment dates, spot capacity issues, and resolve schedule conflicts."
                : analyticsArea
                  ? "Track subscription performance, explore reports, and find your next step."
                  : section === "/orders"
                    ? "Manage and monitor all subscription and one-time orders."
                    : section === "/products"
                      ? "Configure how customers can purchase your products."
                      : "Your sample merchant workspace."}
            </p>
          </div>
          <div className="header-tools">
            <button
              className="search-launch"
              onClick={() => setSearch(true)}
              aria-label="Search orders, products, and reports"
            >
              <Search size={16} />
              <span>Search orders, products, reports…</span>
              <kbd>⌘ K</kbd>
            </button>
            <IconButton
              icon={CircleHelp}
              label="Help and sample guidance"
              onClick={() => setHelp(true)}
            />
            <a href="#/settings" className="account">
              <span className="avatar">L</span>
              <span className="account-name">
                <strong>Loom Demo</strong>
                <small>Demo Store</small>
              </span>
              <ChevronDown size={14} />
            </a>
          </div>
        </header>
        <div className="demo-indicator">
          Interactive demo · Sample data · No live integrations
        </div>
        {storageMessage && (
          <div role="status" className="notice storage-warning">
            {storageMessage}
            {storageMessage.includes("tab") &&
              !storageMessage.startsWith("Session") && (
                <Button onClick={reloadStorage}>Load saved state</Button>
              )}
          </div>
        )}
        {(orderArea || analyticsArea) && (
          <div className="tabs-row">
            <Tabs
              items={(orderArea ? ORDER_TABS : ANALYTICS_TABS).map(
                ([label, href]) => ({ label, href: `#${href}` }),
              )}
              current={`#${path.split("/").slice(0, 2).join("/")}`}
            />
          </div>
        )}
        <Suspense
          fallback={
            <Panel>
              <p role="status">Opening workspace…</p>
            </Panel>
          }
        >
          {path.startsWith("/orders") ? (
            <Orders route={route} />
          ) : path.startsWith("/scheduling") ? (
            <Scheduling />
          ) : path.startsWith("/products") || path.startsWith("/storefront") ? (
            <Products route={route} />
          ) : path.startsWith("/analytics") ? (
            <Analytics />
          ) : path.startsWith("/reports") ? (
            <Reports route={route} />
          ) : path.startsWith("/automations") ? (
            <Automations route={route} />
          ) : path.startsWith("/insights") ? (
            <Insights route={route} />
          ) : (
            <Supporting route={route} />
          )}
        </Suspense>
      </main>
      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.action && (
            <Button onClick={toast.action.run}>{toast.action.label}</Button>
          )}
          <button
            className="toast-close"
            onClick={dismissToast}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}
      {search && (
        <Modal title="Search this demo" onClose={() => setSearch(false)}>
          <input
            className="text-input"
            aria-label="Search query"
            autoFocus
            placeholder="Order number, product, or report"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="result-list">
            {results.map((r) => (
              <a key={r.href} href={r.href} onClick={() => setSearch(false)}>
                <strong>{r.name}</strong>
                <small>{r.kind}</small>
              </a>
            ))}
            {q && !results.length && (
              <p>No sample records match. Try “Greens” or “Revenue”.</p>
            )}
            {!q && (
              <p>Search your synthetic orders, catalog, and saved reports.</p>
            )}
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="Explore Loom" onClose={() => setHelp(false)}>
          <p>
            This independent public demo runs in your browser. The private
            product and the original concept images have separate capability
            boundaries.
          </p>
          <div className="result-list">
            {[
              ["Review a fulfillment", "#/orders"],
              ["Configure a purchase option", "#/products/daily-greens"],
              ["Explore sample insights", "#/insights"],
            ].map(([label, href]) => (
              <a key={href} href={href} onClick={() => setHelp(false)}>
                {label}
                <ArrowRight size={18} />
              </a>
            ))}
          </div>
          <hr />
          <p>
            Analytics uses September 27, 2026. Scheduling is a separate December
            scenario. Automations, tasks, and reminders stay local; nothing runs
            while the browser is closed.
          </p>
        </Modal>
      )}
    </div>
  );
}
