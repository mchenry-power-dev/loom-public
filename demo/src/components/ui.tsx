import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import {
  X,
  ChevronDown,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
export function Button({
  children,
  primary = false,
  danger = false,
  className = "",
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      onClick={(event) => {
        event.currentTarget.focus({ preventScroll: true });
        onClick?.(event);
      }}
      className={`button ${primary ? "primary" : ""} ${danger ? "danger" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
export function IconButton({
  icon: Icon,
  label,
  className = "",
  ...props
}: {
  icon: LucideIcon;
  label: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      {...props}
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
    >
      <Icon size={18} />
    </Button>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Panel({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section {...props} className={`panel ${className}`}>
      {children}
    </section>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const labelId = id + "-label";
  function connect(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (child) => {
      if (!isValidElement<Record<string, unknown>>(child)) return child;
      if (
        ["input", "textarea", "select"].includes(String(child.type)) ||
        child.type === Select
      )
        return cloneElement(child, { id, "aria-labelledby": labelId });
      return child.props.children
        ? cloneElement(child, {}, connect(child.props.children as ReactNode))
        : child;
    });
  }
  return (
    <div className="field">
      <label id={labelId} htmlFor={id}>
        {label}
      </label>
      {connect(children)}
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="select-wrap">
      <select {...props} />
      <ChevronDown size={15} />
    </span>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Sparkline({ values = [] }: { values?: number[] }) {
  if (!values.length) return null;
  const low = Math.min(...values),
    range = Math.max(...values) - low || 1;
  const points = values
    .map(
      (v, i) =>
        `${2 + (i / Math.max(1, values.length - 1)) * 76},${31 - ((v - low) / range) * 27}`,
    )
    .join(" ");
  return (
    <svg className="sparkline" viewBox="0 0 80 34" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}
export function Metric({
  title,
  value,
  detail,
  change,
  icon: Icon = TrendingUp,
  sparkValues,
}: {
  title: string;
  value: ReactNode;
  detail?: string;
  change?: string;
  icon?: LucideIcon;
  sparkValues?: number[];
}) {
  return (
    <div className="metric">
      <div className="metric-title">
        <span className="icon-tile">
          <Icon size={22} />
        </span>
        {title}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        <span>
          {change && (
            <strong className="positive">
              {change}
              <br />
            </strong>
          )}
          {detail}
        </span>
        <Sparkline values={sparkValues} />
      </div>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={wide ? "wide" : ""}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const targets = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ) || [],
        ).filter((el) => el.getClientRects().length > 0);
        e.preventDefault();
        if (!targets.length) {
          ref.current?.focus();
          return;
        }
        const current = targets.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey
          ? current <= 0
            ? targets.length - 1
            : current - 1
          : (current + 1) % targets.length;
        targets[next]?.focus();
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <IconButton icon={X} label="Close dialog" onClick={onClose} />
      </header>
      <div className="dialog-body">{children}</div>
    </dialog>
  );
}
export function SampleSetup({
  children,
  onLoad,
}: {
  children: ReactNode;
  onLoad: () => void;
}) {
  return (
    <Panel className="sample-setup">
      <div className="section-heading">
        <span className="icon-tile">
          <Sparkles />
        </span>
        <div>
          <h3>
            Loom AI <Badge>Sample</Badge>
          </h3>
          <p>Example workflow — no live AI.</p>
        </div>
      </div>
      <div className="tinted">
        <p>{children}</p>
        <Button onClick={onLoad}>
          <Sparkles size={16} /> Load example setup
        </Button>
      </div>
    </Panel>
  );
}
export function Tabs({
  items,
  current,
}: {
  items: { label: string; href: string }[];
  current: string;
}) {
  return (
    <nav className="tabs" aria-label="Section navigation">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={current === item.href ? "active" : ""}
          aria-current={current === item.href ? "page" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
export function Logo() {
  return (
    <a href="#/home" className="logo" aria-label="Loom home">
      <svg viewBox="0 0 44 30" aria-hidden="true">
        <rect
          x="5"
          y="6"
          width="23"
          height="19"
          rx="9"
          transform="rotate(-40 16 15)"
        />
        <rect
          x="16"
          y="6"
          width="23"
          height="19"
          rx="9"
          transform="rotate(40 27 15)"
        />
      </svg>
      <span>
        Loom<sup>™</sup>
      </span>
    </a>
  );
}
