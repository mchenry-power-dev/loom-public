import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  Gift,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  ShoppingCart,
  Smartphone,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Empty,
  Field,
  IconButton,
  Modal,
  Panel,
  SampleSetup,
  Select,
} from "../components/ui";
import { ProductArt } from "../components/ProductArt";
import { useDemo } from "../components/store";
import { money, uid } from "../components/format";
import { useUnsavedChanges } from "../components/router";
import { purchasePrice } from "../selectors";
import { validatePurchase } from "../domain/validation";
import type { Frequency, Product, PurchaseConfig } from "../domain/model";
import "./products.css";
const FREQUENCIES: Frequency[] = [
  "2 weeks",
  "4 weeks",
  "Monthly",
  "6 weeks",
  "8 weeks",
];
const freq = (f: Frequency) => (f === "Monthly" ? "Monthly" : `Every ${f}`);
export default function Products({ route }: { route: string }) {
  const { state } = useDemo();
  const path = route.split("?")[0];
  const id = path.split("/")[2];
  const product = state.products.find((p) => p.id === id);
  if (!id)
    return (
      <Panel>
        <div className="panel-header">
          <div>
            <h2>Product catalog</h2>
            <p>Configure purchase options for your sample store.</p>
          </div>
          <Badge tone="green">{state.products.length} active products</Badge>
        </div>
        <div className="catalog-grid">
          {state.products.map((p) => (
            <a className="catalog-card" href={`#/products/${p.id}`} key={p.id}>
              <ProductArt product={p} />
              <div>
                <h3>{p.name}</h3>
                <p>
                  {money(p.priceCents)} · {p.category}
                </p>
                <span>
                  Purchase options <ArrowRight size={16} />
                </span>
              </div>
            </a>
          ))}
        </div>
      </Panel>
    );
  if (!product)
    return (
      <Panel>
        <Empty title="Product not found">
          Choose a product from the catalog.
        </Empty>
        <a href="#/products">Back to products</a>
      </Panel>
    );
  return path.startsWith("/storefront") ? (
    <div className="local-storefront">
      <a className="back-link" href={`#/products/${product.id}`}>
        <ArrowLeft size={16} /> Back to purchase options
      </a>
      <Panel>
        <div className="panel-header">
          <div>
            <h2>Demo storefront</h2>
            <p>Applied sample configuration · No checkout or payment.</p>
          </div>
          <Badge>Local preview</Badge>
        </div>
        <Storefront
          product={product}
          config={state.purchaseApplied[product.id]}
          expanded
        />
      </Panel>
    </div>
  ) : (
    <ProductEditor key={product.id} product={product} />
  );
}
function ProductEditor({ product }: { product: Product }) {
  const { state, dispatch, notify } = useDemo();
  const [config, setConfig] = useState(() =>
    structuredClone(state.purchaseDrafts[product.id]),
  );
  const [baseline, setBaseline] = useState(() =>
    JSON.stringify(state.purchaseDrafts[product.id]),
  );
  const [tab, setTab] = useState("edit");
  const [device, setDevice] = useState("phone");
  const [phone, setPhone] = useState("393");
  const [benefit, setBenefit] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [prepaidOpen, setPrepaidOpen] = useState(config.prepaid.enabled);
  const [oneTimeEdit, setOneTimeEdit] = useState(false);
  const errors = validatePurchase(config);
  const dirty = JSON.stringify(config) !== baseline;
  const guard = useUnsavedChanges(dirty);
  const applied =
    JSON.stringify(config) ===
    JSON.stringify(state.purchaseApplied[product.id]);
  const update = (patch: Partial<PurchaseConfig>) =>
    setConfig({ ...config, ...patch });
  function toggleFrequency(f: Frequency) {
    const frequencies = config.frequencies.includes(f)
      ? config.frequencies.filter((x) => x !== f)
      : [...config.frequencies, f];
    update({
      frequencies,
      defaultFrequency: frequencies.includes(config.defaultFrequency)
        ? config.defaultFrequency
        : frequencies[0] || config.defaultFrequency,
    });
  }
  function save() {
    if (errors.length) return;
    if (!dirty) {
      notify("This draft already matches the saved configuration.");
      return;
    }
    if (dispatch({ type: "purchase/draft", productId: product.id, config })) {
      setBaseline(JSON.stringify(config));
      notify("Purchase-options draft saved locally.");
    }
  }
  return (
    <>
      <div className="product-page-actions">
        <a className="back-link" href="#/products">
          <ArrowLeft size={18} /> Products
        </a>
        <div className="toolbar">
          <a className="button" href={`#/storefront/${product.id}`}>
            <Eye size={16} /> Preview storefront
          </a>
          <Button onClick={save} disabled={!!errors.length}>
            <Save size={16} /> Save draft
          </Button>
          <Button
            primary
            onClick={() => setConfirm(true)}
            disabled={!!errors.length || (applied && !dirty)}
          >
            Publish changes
          </Button>
        </div>
      </div>
      <div className="mobile-editor-tabs">
        <Button primary={tab === "edit"} onClick={() => setTab("edit")}>
          Edit
        </Button>
        <Button primary={tab === "preview"} onClick={() => setTab("preview")}>
          Preview
        </Button>
      </div>
      <div className={`purchase-layout showing-${tab}`}>
        <div className="purchase-editor">
          <Panel className="product-identity">
            <ProductArt product={product} small />
            <div>
              <h2>
                {product.name} <Badge tone="green">Active</Badge>
              </h2>
              <p>
                <a href="#/products">Products</a> › {product.name}
              </p>
            </div>
            <a className="button" href={`#/storefront/${product.id}`}>
              View product <ArrowRight size={15} />
            </a>
          </Panel>
          <SampleSetup
            onLoad={() =>
              setConfig({
                ...config,
                oneTime: true,
                subscription: true,
                discount: 10,
                frequencies: ["2 weeks", "Monthly"],
                defaultFrequency: "2 weeks",
                benefits: [
                  "10% savings",
                  "Flexible delivery frequency",
                  "Pause or cancel anytime",
                ],
              })
            }
          >
            Subscribe &amp; Save with 10% off, every two weeks or monthly. Load
            this visible preset, then adjust it manually.
          </SampleSetup>
          <Panel>
            <div className="panel-header">
              <div>
                <h2>Customer purchase options</h2>
                <p>
                  Enable and configure the options available for this product.
                </p>
              </div>
              <Badge tone={errors.length ? "amber" : "green"}>
                {errors.length
                  ? "Review configuration"
                  : dirty
                    ? "Unsaved changes"
                    : applied
                      ? "Applied to demo"
                      : "Draft saved"}
              </Badge>
            </div>
            {errors.length > 0 && (
              <div className="error" role="alert">
                {errors.map((e) => (
                  <p key={e}>{e}</p>
                ))}
              </div>
            )}
            <section className="purchase-option">
              <div className="option-heading">
                <span className="icon-tile">
                  <ShoppingCart />
                </span>
                <div>
                  <h3>One-time purchase</h3>
                  <p>Let customers purchase without a subscription.</p>
                </div>
                <Toggle
                  label="Enable one-time purchase"
                  checked={config.oneTime}
                  onChange={(value) => update({ oneTime: value })}
                />
                <Button onClick={() => setOneTimeEdit(!oneTimeEdit)}>
                  {oneTimeEdit ? "Done" : "Edit"}
                </Button>
              </div>
              <div className="option-facts">
                <span>
                  <small>Price</small>
                  <strong>{money(product.priceCents)}</strong>
                </span>
                <span>
                  <small>Inventory</small>
                  <strong>Sample product inventory</strong>
                </span>
                <span>
                  <small>Storefront experience</small>
                  <strong>Local cart preview</strong>
                </span>
              </div>
              {oneTimeEdit && (
                <p className="notice">
                  The catalog base price is fixed. Enable or disable this mode
                  with the switch; subscription discounts are editable below.
                </p>
              )}
            </section>
            <section className="purchase-option subscription-option">
              <div className="option-heading">
                <span className="icon-tile">
                  <RefreshCw />
                </span>
                <div>
                  <h3>Subscribe &amp; Save</h3>
                  <p>Recurring deliveries with a configurable discount.</p>
                </div>
                <Toggle
                  label="Enable Subscribe and Save"
                  checked={config.subscription}
                  onChange={(value) => update({ subscription: value })}
                />
              </div>
              <div className="purchase-controls">
                <Field
                  label="Discount (%)"
                  hint="Whole percentage, 0–50. Applies to each delivery."
                >
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={config.discount}
                    onChange={(e) =>
                      update({ discount: Number(e.target.value) })
                    }
                  />
                </Field>
                <fieldset>
                  <legend>Delivery frequencies</legend>
                  <div className="frequency-grid">
                    {FREQUENCIES.map((f) => (
                      <label className="check-line" key={f}>
                        <input
                          type="checkbox"
                          checked={config.frequencies.includes(f)}
                          onChange={() => toggleFrequency(f)}
                        />
                        {freq(f)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field
                  label="Default frequency"
                  hint="Monthly is a calendar month; four weeks is 28 days."
                >
                  <Select
                    value={config.defaultFrequency}
                    onChange={(e) =>
                      update({ defaultFrequency: e.target.value as Frequency })
                    }
                  >
                    {config.frequencies.map((f) => (
                      <option key={f} value={f}>
                        {freq(f)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="benefits">
                <small>Subscriber benefits (shown in storefront)</small>
                <div className="benefit-chips">
                  {config.benefits.map((b, i) => (
                    <span key={i}>
                      {b}
                      <button
                        aria-label={`Remove benefit ${b}`}
                        onClick={() =>
                          update({
                            benefits: config.benefits.filter((_, n) => i !== n),
                          })
                        }
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="field-row">
                  <input
                    className="text-input"
                    aria-label="New subscriber benefit"
                    placeholder="Add a short benefit"
                    maxLength={70}
                    value={benefit}
                    onChange={(e) => setBenefit(e.target.value)}
                  />
                  <Button
                    disabled={!benefit.trim() || config.benefits.length >= 5}
                    onClick={() => {
                      update({
                        benefits: [...config.benefits, benefit.trim()],
                      });
                      setBenefit("");
                    }}
                  >
                    <Plus size={15} /> Add benefit
                  </Button>
                </div>
              </div>
            </section>
            <section className="purchase-option prepaid-option">
              <div className="option-heading">
                <span className="icon-tile">
                  <Gift />
                </span>
                <div>
                  <h3>Prepaid plans</h3>
                  <p>Bounded multi-delivery sample plans.</p>
                </div>
                <Toggle
                  label="Enable prepaid plans"
                  checked={config.prepaid.enabled}
                  onChange={(value) => {
                    update({ prepaid: { ...config.prepaid, enabled: value } });
                    if (value) setPrepaidOpen(true);
                  }}
                />
                <IconButton
                  icon={ChevronDown}
                  label={
                    prepaidOpen
                      ? "Collapse prepaid settings"
                      : "Expand prepaid settings"
                  }
                  aria-expanded={prepaidOpen}
                  onClick={() => setPrepaidOpen(!prepaidOpen)}
                />
              </div>
              {prepaidOpen && (
                <div className="form-grid">
                  <Field label="Prepaid deliveries">
                    <input
                      type="number"
                      min="2"
                      max="12"
                      value={config.prepaid.deliveries}
                      onChange={(e) =>
                        update({
                          prepaid: {
                            ...config.prepaid,
                            deliveries: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </Field>
                  <Field label="Prepaid discount (%)">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={config.prepaid.discount}
                      onChange={(e) =>
                        update({
                          prepaid: {
                            ...config.prepaid,
                            discount: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </Field>
                  <p>
                    {config.prepaid.deliveries} deliveries at{" "}
                    {money(purchasePrice(product, config, "prepaid"))} each.
                    Sample upfront total:{" "}
                    {money(
                      purchasePrice(product, config, "prepaid") *
                        config.prepaid.deliveries,
                    )}
                    .
                  </p>
                </div>
              )}
            </section>
          </Panel>
        </div>
        <Panel
          className={`storefront-preview ${device === "desktop" ? "desktop-preview" : ""}`}
        >
          <div className="preview-header">
            <h3>Storefront preview</h3>
            <div className="toolbar">
              <Select
                aria-label="Preview device size"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              >
                <option value="393">Phone · 393px</option>
                <option value="430">Phone · 430px</option>
              </Select>
              <IconButton
                icon={Smartphone}
                label="Mobile storefront preview"
                aria-pressed={device === "phone"}
                onClick={() => setDevice("phone")}
              />
              <IconButton
                icon={Monitor}
                label="Desktop storefront preview"
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              />
            </div>
          </div>
          <p className="preview-caption">
            Draft preview · changes appear immediately
          </p>
          <div
            className={`phone-frame ${phone === "430" ? "phone-wide" : ""} ${device === "desktop" ? "desktop-frame" : ""}`}
          >
            <div className="phone-status">
              <strong>9:41</strong>
              <span className="phone-island" />
              <span>▮▮▮ ▰</span>
            </div>
            <Storefront
              product={product}
              config={config}
              disabled={!!errors.length}
            />
          </div>
        </Panel>
      </div>
      {confirm && (
        <Modal title="Apply to demo store" onClose={() => setConfirm(false)}>
          <p>
            Apply these purchase options to the local storefront for{" "}
            {product.name}. No Shopify configuration or payment will change.
          </p>
          <dl className="definition-list">
            <dt>Subscription discount</dt>
            <dd>{config.discount}%</dd>
            <dt>Subscription price</dt>
            <dd>{money(purchasePrice(product, config))}</dd>
            <dt>Default frequency</dt>
            <dd>{freq(config.defaultFrequency)}</dd>
          </dl>
          <div className="dialog-footer">
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              primary
              onClick={() => {
                if (
                  dispatch({
                    type: "purchase/apply",
                    productId: product.id,
                    config,
                  })
                ) {
                  setBaseline(JSON.stringify(config));
                  setConfirm(false);
                  notify("Purchase options applied to the demo store only.");
                }
              }}
            >
              Apply to demo store
            </Button>
          </div>
        </Modal>
      )}
      {guard.pending && (
        <Modal title="Discard unsaved changes?" onClose={guard.cancel}>
          <p>These purchase-option edits have not been saved.</p>
          <div className="dialog-footer">
            <Button onClick={guard.cancel}>Keep editing</Button>
            <Button danger onClick={guard.discard}>
              Discard changes
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        aria-label={label}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span />
    </label>
  );
}
function Storefront({
  product,
  config,
  expanded = false,
  disabled = false,
}: {
  product: Product;
  config: PurchaseConfig;
  expanded?: boolean;
  disabled?: boolean;
}) {
  const { state, dispatch, notify } = useDemo();
  const initialMode = config.subscription
    ? "subscription"
    : config.oneTime
      ? "one-time"
      : "prepaid";
  const [mode, setMode] = useState<"one-time" | "subscription" | "prepaid">(
    initialMode,
  );
  const [frequency, setFrequency] = useState(config.defaultFrequency);
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState(false);
  useEffect(() => {
    if (
      (mode === "subscription" && !config.subscription) ||
      (mode === "one-time" && !config.oneTime) ||
      (mode === "prepaid" && !config.prepaid.enabled)
    )
      setMode(initialMode);
    if (!config.frequencies.includes(frequency))
      setFrequency(config.defaultFrequency);
  }, [config, mode, frequency, initialMode]);
  useEffect(
    () => setFrequency(config.defaultFrequency),
    [config.defaultFrequency],
  );
  const unit =
    purchasePrice(product, config, mode) *
    (mode === "prepaid" ? config.prepaid.deliveries : 1);
  return (
    <div className={`storefront ${expanded ? "expanded" : ""}`}>
      <ProductArt product={product} />
      <div className="storefront-content">
        <h2>{product.name}</h2>
        <p>{product.subtitle} Sample product for exploring purchase options.</p>
        <strong className="storefront-price">
          {money(product.priceCents)}
        </strong>
        <div className="purchase-choices">
          {config.oneTime && (
            <label
              className={`storefront-choice ${mode === "one-time" ? "selected" : ""}`}
            >
              <span>
                <input
                  type="radio"
                  name={"mode-" + product.id}
                  checked={mode === "one-time"}
                  onChange={() => setMode("one-time")}
                />{" "}
                One-time purchase
              </span>
              <strong>{money(product.priceCents)}</strong>
            </label>
          )}
          {config.subscription && (
            <label
              className={`storefront-choice ${mode === "subscription" ? "selected" : ""}`}
            >
              <span>
                <input
                  type="radio"
                  name={"mode-" + product.id}
                  checked={mode === "subscription"}
                  onChange={() => setMode("subscription")}
                />{" "}
                Subscribe &amp; Save
              </span>
              <div>
                <Badge tone="violet">Save {config.discount}%</Badge>
                <strong>{money(purchasePrice(product, config))}</strong>
                <del>{money(product.priceCents)}</del>
              </div>
            </label>
          )}
          {config.prepaid.enabled && (
            <label
              className={`storefront-choice ${mode === "prepaid" ? "selected" : ""}`}
            >
              <span>
                <input
                  type="radio"
                  name={"mode-" + product.id}
                  checked={mode === "prepaid"}
                  onChange={() => setMode("prepaid")}
                />{" "}
                Prepay {config.prepaid.deliveries} deliveries
              </span>
              <strong>
                {money(
                  purchasePrice(product, config, "prepaid") *
                    config.prepaid.deliveries,
                )}
              </strong>
            </label>
          )}
          {mode !== "one-time" && (
            <Field label="Deliver every">
              <Select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
              >
                {config.frequencies.map((f) => (
                  <option key={f} value={f}>
                    {freq(f)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        {mode !== "one-time" && (
          <ul className="storefront-benefits">
            {config.benefits.map((b, i) => (
              <li key={i}>
                <Check size={13} />
                {b}
              </li>
            ))}
          </ul>
        )}
        <Field label="Quantity">
          <Select
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </Select>
        </Field>
        <Button
          primary
          disabled={disabled}
          onClick={() => {
            if (
              dispatch({
                type: "cart/add",
                item: {
                  id: uid("cart"),
                  productId: product.id,
                  quantity,
                  type: mode,
                  unitPriceCents: unit,
                  ...(mode !== "one-time" ? { frequency } : {}),
                },
              })
            ) {
              setCart(true);
              notify(
                "Sample item added to the local cart. No checkout or payment.",
              );
            }
          }}
        >
          Add to cart · {money(unit * quantity)}
        </Button>
      </div>
      {cart && (
        <Modal title="Your sample cart" onClose={() => setCart(false)}>
          <p>Local items only. Checkout and payment are unavailable.</p>
          <div className="cart-items">
            {state.cart.map((item) => (
              <div key={item.id}>
                <strong>
                  {state.products.find((p) => p.id === item.productId)?.name} ×{" "}
                  {item.quantity}
                </strong>
                <span>
                  {item.type}
                  {item.frequency ? ` · ${freq(item.frequency)}` : ""}
                </span>
                <b>{money(item.unitPriceCents * item.quantity)}</b>
              </div>
            ))}
          </div>
          <div className="dialog-footer">
            <Button primary onClick={() => setCart(false)}>
              Continue exploring
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
