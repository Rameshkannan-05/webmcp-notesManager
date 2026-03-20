import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useWebMCP } from "@mcp-b/react-webmcp";
import type {
  Product,
  ProductInput,
  ProductToolDefinition,
  ProductToolsContext,
  ToolExecutionResult,
} from "./tools/product.types";
import { createProductsApi } from "./tools/product.service";
import {
  addProductToolDef,
  deleteProductToolDef,
  listProductsToolDef,
  updateProductToolDef,
  viewProductDetailsToolDef,
} from "./tools/product.tools";
import { toWebMcpTool } from "./tools/webmcp.adapter";
import ProductCard from "./components/ProductCard";
import ProductModal, { type ProductModalSubmitValues } from "./components/ProductModal";
import ChatBot from "./components/ChatBot";

type ModalMode = "add" | "edit";

const API_BASE_URL = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "").replace(/\/api$/i, "");

function parseNonNegative(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function toProductInput(values: ProductModalSubmitValues): ProductInput | null {
  const price = parseNonNegative(values.price);
  const stock = parseNonNegative(values.stock);

  if (price === null || stock === null) {
    return null;
  }

  const name = values.name.trim();
  const description = values.description.trim();
  const category = values.category.trim();

  if (!name || !description || !category) {
    return null;
  }

  return {
    name,
    description,
    price,
    category,
    stock,
  };
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  const productsRef = useRef<Product[]>([]);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const productsApi = useMemo(() => createProductsApi(API_BASE_URL), []);

  const fetchProducts = useCallback(async () => {
    const next = await productsApi.listProducts();
    setProducts(next);
    return next;
  }, [productsApi]);

  const openAddModal = useCallback(() => {
    setEditingProduct(null);
    setModalMode("add");
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((product: Product) => {
    setEditingProduct(product);
    setModalMode("edit");
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (isSubmittingModal) {
      return;
    }
    setIsModalOpen(false);
  }, [isSubmittingModal]);

  const toolContext = useMemo<ProductToolsContext>(
    () => ({
      apiBaseUrl: API_BASE_URL,
      logToolCall: (toolName, params) => {
        console.log(`[MCP Tool] ${toolName} called`, params ?? {});
      },
      syncProducts: setProducts,
      navigateToProductDetails: (productId) => {
        const product = productsRef.current.find((item) => item._id === productId);
        if (!product) {
          toast.error("Product not found for details view");
          return;
        }
        openEditModal(product);
      },
    }),
    [openEditModal],
  );

  const runTool = useCallback(
    async (
      toolDef: ProductToolDefinition,
      input: unknown,
      options: { successToast?: boolean; errorToast?: boolean } = {},
    ): Promise<ToolExecutionResult> => {
      const result = await toolDef.execute(input, toolContext);

      if (result.success && options.successToast) {
        toast.success(result.message);
      }

      if (!result.success && options.errorToast !== false) {
        toast.error(result.message);
      }

      return result;
    },
    [toolContext],
  );

  const runMutationTool = useCallback(
    async (
      toolDef: ProductToolDefinition,
      input: unknown,
      successMessageFallback: string,
    ): Promise<ToolExecutionResult> => {
      const result = await runTool(toolDef, input, { successToast: true });
      if (result.success) {
        try {
          await fetchProducts();
        } catch {
          toast.error(successMessageFallback);
        }
      }
      return result;
    },
    [fetchProducts, runTool],
  );

  const addProductHandler = useCallback(
    async (input: unknown) =>
      runMutationTool(addProductToolDef, input, "Product added, but refresh failed"),
    [runMutationTool],
  );

  const updateProductHandler = useCallback(
    async (input: unknown) =>
      runMutationTool(updateProductToolDef, input, "Product updated, but refresh failed"),
    [runMutationTool],
  );

  const deleteProductHandler = useCallback(
    async (input: unknown) =>
      runMutationTool(deleteProductToolDef, input, "Product deleted, but refresh failed"),
    [runMutationTool],
  );

  const listProductsHandler = useCallback(async (): Promise<ToolExecutionResult> => {
    try {
      const nextProducts = await fetchProducts();
      return {
        success: true,
        message: "Products fetched successfully",
        data: {
          total: nextProducts.length,
          products: nextProducts,
        },
      };
    } catch {
      return {
        success: false,
        message: "Unable to refresh products",
        data: {
          total: productsRef.current.length,
          products: productsRef.current,
        },
      };
    }
  }, [fetchProducts]);

  const viewProductDetailsHandler = useCallback(
    async (input: unknown) =>
      runTool(viewProductDetailsToolDef, input, { successToast: false, errorToast: true }),
    [runTool],
  );

  const addProductTool = useMemo(() => {
    const tool = toWebMcpTool(addProductToolDef, toolContext);
    return { ...tool, handler: addProductHandler };
  }, [addProductHandler, toolContext]);

  const deleteProductTool = useMemo(() => {
    const tool = toWebMcpTool(deleteProductToolDef, toolContext);
    return { ...tool, handler: deleteProductHandler };
  }, [deleteProductHandler, toolContext]);

  const updateProductTool = useMemo(() => {
    const tool = toWebMcpTool(updateProductToolDef, toolContext);
    return { ...tool, handler: updateProductHandler };
  }, [toolContext, updateProductHandler]);

  const listProductsTool = useMemo(() => {
    const tool = toWebMcpTool(listProductsToolDef, toolContext);
    return { ...tool, handler: listProductsHandler };
  }, [listProductsHandler, toolContext]);

  const viewProductDetailsTool = useMemo(() => {
    const tool = toWebMcpTool(viewProductDetailsToolDef, toolContext);
    return { ...tool, handler: viewProductDetailsHandler };
  }, [toolContext, viewProductDetailsHandler]);

  useWebMCP(addProductTool, []);
  useWebMCP(deleteProductTool, []);
  useWebMCP(updateProductTool, []);
  useWebMCP(listProductsTool, []);
  useWebMCP(viewProductDetailsTool, []);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingProducts(true);
        await fetchProducts();
      } catch {
        toast.error("Unable to load products");
      } finally {
        setIsLoadingProducts(false);
      }
    };

    void load();
  }, [fetchProducts]);

  const handleModalSubmit = useCallback(
    async (values: ProductModalSubmitValues) => {
      const productInput = toProductInput(values);
      if (!productInput) {
        toast.error("Please enter valid product values");
        return;
      }

      setIsSubmittingModal(true);
      try {
        if (modalMode === "add") {
          const result = await addProductHandler(productInput);
          if (result.success) {
            setIsModalOpen(false);
          }
          return;
        }

        if (!editingProduct?._id) {
          toast.error("No product selected for edit");
          return;
        }

        const result = await updateProductHandler({
          id: editingProduct._id,
          ...productInput,
        });

        if (result.success) {
          setIsModalOpen(false);
          setEditingProduct(null);
        }
      } finally {
        setIsSubmittingModal(false);
      }
    },
    [addProductHandler, editingProduct, modalMode, updateProductHandler],
  );

  const handleDelete = useCallback(
    async (product: Product) => {
      const ok = window.confirm(`Delete "${product.name}"? This action cannot be undone.`);
      if (!ok) {
        return;
      }
      await deleteProductHandler({ id: product._id });
    },
    [deleteProductHandler],
  );

  const handleChatSettled = useCallback(async () => {
    try {
      await fetchProducts();
    } catch {
      toast.error("Unable to sync product list after chat");
    }
  }, [fetchProducts]);

  return (
    <div className="min-h-screen text-slate-100">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(18, 18, 28, 0.92)",
            color: "#e2e8f0",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            backdropFilter: "blur(10px)",
          },
          success: {
            iconTheme: { primary: "#6366f1", secondary: "#0b1020" },
          },
        }}
      />

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <header className="glass-card mb-10 flex items-center justify-between rounded-2xl px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-[0_0_25px_rgba(99,102,241,0.7)]" />
            <h1 className="text-lg font-semibold tracking-wide sm:text-xl">Product Manager</h1>
          </div>
          <div className="hidden rounded-full border border-indigo-400/35 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200 sm:block">
            Powered by WebMCP + Gemini
          </div>
        </header>

        <section className="mb-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-card rounded-3xl p-7 sm:p-10">
            <p className="mb-3 inline-flex rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
              Single-page workspace
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Manage your product catalog with a sleek dashboard and AI assistant.
            </h2>
            <p className="mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
              Create, edit, remove, and monitor inventory in one place with live MCP tool bindings.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="neon-ring mt-7 inline-flex items-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-indigo-400"
            >
              Add Product
            </button>
          </div>

          <div className="glass-card rounded-3xl p-7 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Overview</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs text-slate-400">Total Products</p>
                <p className="mt-1 text-2xl font-semibold">{products.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs text-slate-400">In Stock Items</p>
                <p className="mt-1 text-2xl font-semibold">
                  {products.filter((item) => item.stock > 0).length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white sm:text-2xl">Products</h3>
            <button
              type="button"
              onClick={openAddModal}
              className="rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200 transition hover:bg-indigo-500/20"
            >
              + New
            </button>
          </div>

          {isLoadingProducts ? (
            <div className="glass-card rounded-2xl p-10 text-center text-slate-300">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center text-slate-300">
              No products yet. Add your first product to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <ProductModal
        isOpen={isModalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        isSubmitting={isSubmittingModal}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />

      <ChatBot onChatSettled={handleChatSettled} />
    </div>
  );
}


