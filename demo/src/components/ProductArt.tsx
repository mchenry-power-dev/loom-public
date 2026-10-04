import { useId } from "react";
import type { Product } from "../domain/model";
/** Original vector packaging, independently drawn for this synthetic catalog. */
export function ProductArt({
  product,
  small = false,
}: {
  product: Product;
  small?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      viewBox="0 0 320 250"
      className={`product-art ${small ? "small" : ""}`}
      role="img"
      aria-label={`${product.name}, sample packaging`}
    >
      <defs>
        <linearGradient id={id} x2="1" y2="1">
          <stop stopColor="#eef1e9" />
          <stop offset="1" stopColor="#d3dfcc" />
        </linearGradient>
        <linearGradient id={id + "b"} x2="1">
          <stop stopColor="#f5f7e9" />
          <stop offset="1" stopColor="#c6d2bb" />
        </linearGradient>
      </defs>
      <rect width="320" height="250" rx="12" fill={`url(#${id})`} />
      <ellipse cx="160" cy="225" rx="70" ry="10" fill="#25432d" opacity=".12" />
      {[0, 1, 2, 3].map((n) => (
        <g
          key={n}
          transform={`translate(${n < 2 ? 30 + n * 22 : 300 - n * 12} ${130 + (n % 2) * 55}) rotate(${n < 2 ? -30 : 30})`}
          fill={product.color}
          opacity=".7"
        >
          <ellipse cy="-20" rx="11" ry="29" transform="rotate(-30)" />
          <ellipse cy="-24" rx="10" ry="24" transform="rotate(28)" />
          <path d="M0 -45v70" stroke="#244832" strokeWidth="2" />
        </g>
      ))}
      <path
        d="M104 37Q160 31 216 37L207 72L218 219Q160 230 101 219L111 74Z"
        fill={`url(#${id}b)`}
        stroke="#acbaa2"
      />
      <path d="M108 44H211M108 49H211" stroke="#bcc8ae" strokeWidth="2" />
      <rect
        x="116"
        y="92"
        width="88"
        height="90"
        rx="2"
        fill="#fafbf4"
        opacity=".85"
      />
      <text
        x="160"
        y="111"
        textAnchor="middle"
        fill={product.color}
        fontSize="9"
        letterSpacing="2"
        fontWeight="700"
      >
        LOOM GOODS
      </text>
      <text
        x="160"
        y="137"
        textAnchor="middle"
        fill="#24332a"
        fontSize="15"
        fontWeight="700"
      >
        {product.name.split(" ").slice(0, 2).join(" ")}
      </text>
      <text x="160" y="154" textAnchor="middle" fill="#53634d" fontSize="9">
        SAMPLE PRODUCT
      </text>
      <path
        d="M148 172q12 -17 25 0q-12 17 -25 0"
        fill="none"
        stroke={product.color}
      />
      <text
        x="160"
        y="207"
        textAnchor="middle"
        fill="#53634d"
        fontSize="8"
        letterSpacing="1"
      >
        DEMO CATALOG
      </text>
    </svg>
  );
}
