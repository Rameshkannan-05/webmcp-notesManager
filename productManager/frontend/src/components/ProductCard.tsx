import type { Product } from "../tools/product.types";

type ProductCardProps = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export default function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const hasStock = product.stock > 0;

  return (
    <article className="glass-card group rounded-2xl p-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_28px_rgba(99,102,241,0.35)]">
      <div className="mb-4 h-32 rounded-xl bg-gradient-to-br from-indigo-500/40 via-violet-500/25 to-cyan-500/20" />

      <div className="flex items-start justify-between gap-3">
        <h4 className="text-lg font-semibold text-white">{product.name}</h4>
        <span
          className={`rounded-full px-2 py-1 text-[11px] ${
            hasStock
              ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border border-rose-400/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {hasStock ? `In stock: ${product.stock}` : "Out of stock"}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-slate-300">{product.description}</p>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xl font-semibold text-indigo-200">${product.price.toFixed(2)}</p>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {product.category}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200 transition hover:bg-indigo-500/20"
          aria-label={`Edit ${product.name}`}
          title="Edit"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDelete(product)}
          className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20"
          aria-label={`Delete ${product.name}`}
          title="Delete"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      </div>
    </article>
  );
}