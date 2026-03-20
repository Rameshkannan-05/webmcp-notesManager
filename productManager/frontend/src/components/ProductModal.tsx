import { useEffect, useState } from "react";
import type { Product } from "../tools/product.types";

export type ProductModalSubmitValues = {
  name: string;
  description: string;
  price: string;
  category: string;
  stock: string;
};

type ProductModalProps = {
  isOpen: boolean;
  mode: "add" | "edit";
  initialProduct: Product | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ProductModalSubmitValues) => Promise<void>;
};

const EMPTY_FORM: ProductModalSubmitValues = {
  name: "",
  description: "",
  price: "",
  category: "",
  stock: "",
};

export default function ProductModal({
  isOpen,
  mode,
  initialProduct,
  isSubmitting,
  onClose,
  onSubmit,
}: ProductModalProps) {
  const [form, setForm] = useState<ProductModalSubmitValues>(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === "edit" && initialProduct) {
      setForm({
        name: initialProduct.name,
        description: initialProduct.description,
        price: String(initialProduct.price),
        category: initialProduct.category,
        stock: String(initialProduct.stock),
      });
      return;
    }

    setForm(EMPTY_FORM);
  }, [initialProduct, isOpen, mode]);

  if (!isOpen) {
    return null;
  }

  const title = mode === "add" ? "Add Product" : "Edit Product";
  const buttonText = isSubmitting
    ? "Saving..."
    : mode === "add"
      ? "Create Product"
      : "Save Changes";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-200 transition hover:bg-white/10"
            disabled={isSubmitting}
          >
            Close
          </button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit(form);
          }}
        >
          <label className="block text-sm text-slate-200">
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400"
              required
            />
          </label>

          <label className="block text-sm text-slate-200">
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400"
              rows={3}
              required
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-200">
              Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400"
                required
              />
            </label>

            <label className="block text-sm text-slate-200">
              Stock
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400"
                required
              />
            </label>
          </div>

          <label className="block text-sm text-slate-200">
            Category
            <input
              type="text"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-400"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="neon-ring mt-2 w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {buttonText}
          </button>
        </form>
      </div>
    </div>
  );
}