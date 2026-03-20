import { z } from "zod";
import { ApiRequestError, createProductsApi } from "./product.service.js";
import type {
  Product,
  ProductInput,
  ProductToolDefinition,
  ProductToolsContext,
  ToolExecutionResult,
} from "./product.types.js";

const addProductSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  description: z.string().trim().min(1, "description is required"),
  price: z.number().nonnegative("price must be a non-negative number"),
  category: z.string().trim().min(1, "category is required"),
  stock: z.number().int("stock must be an integer").nonnegative(),
});

const deleteProductSchema = z.object({
  id: z.string().trim().min(1, "Product id is required"),
});

const updateProductSchema = z.object({
  id: z.string().trim().min(1, "Product id is required"),
  name: z.string().trim().min(1, "name is required"),
  description: z.string().trim().min(1, "description is required"),
  price: z.number().nonnegative("price must be a non-negative number"),
  category: z.string().trim().min(1, "category is required"),
  stock: z.number().int("stock must be an integer").nonnegative(),
});

const viewProductDetailsSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, "productId is required")
    .describe("The MongoDB ID of the selected product"),
});

export const ADD_PRODUCT_INPUT_SCHEMA = addProductSchema.shape;
export const DELETE_PRODUCT_INPUT_SCHEMA = deleteProductSchema.shape;
export const UPDATE_PRODUCT_INPUT_SCHEMA = updateProductSchema.shape;
export const VIEW_PRODUCT_DETAILS_INPUT_SCHEMA = viewProductDetailsSchema.shape;

export type AddProductInput = z.infer<typeof addProductSchema>;
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ViewProductDetailsInput = z.infer<typeof viewProductDetailsSchema>;

function success(message: string, data: unknown): ToolExecutionResult {
  return {
    success: true,
    message,
    data,
  };
}

function failure(message: string, data: unknown = null): ToolExecutionResult {
  return {
    success: false,
    message,
    data,
  };
}

function zodErrorMessage(error: z.ZodError): string {
  return error.errors[0]?.message ?? "Validation failed";
}

async function syncProductsState(
  apiBaseUrl: string,
  context: ProductToolsContext,
): Promise<void> {
  if (!context.syncProducts) {
    return;
  }

  const api = createProductsApi(apiBaseUrl);
  const products = await api.listProducts();
  context.syncProducts(products);
}

function handleToolError(error: unknown, fallbackMessage: string): ToolExecutionResult {
  if (error instanceof ApiRequestError) {
    return failure(error.message, error.data);
  }

  if (error instanceof Error) {
    return failure(error.message || fallbackMessage, null);
  }

  return failure(fallbackMessage, null);
}

export const addProductToolDef: ProductToolDefinition = {
  name: "add_product",
  description:
    "Create a new product with name, description, price, category, and stock",
  inputSchema: ADD_PRODUCT_INPUT_SCHEMA,
  execute: async (input, context) => {
    context.logToolCall?.("add_product", input);
    const parsed = addProductSchema.safeParse(input);
    if (!parsed.success) {
      return failure(zodErrorMessage(parsed.error));
    }

    try {
      const api = createProductsApi(context.apiBaseUrl);
      const product = await api.addProduct(parsed.data);
      await syncProductsState(context.apiBaseUrl, context);
      return success("Product added successfully", { product });
    } catch (error) {
      return handleToolError(error, "Failed to add product");
    }
  },
};

export const deleteProductToolDef: ProductToolDefinition = {
  name: "delete_product",
  description: "Delete a product by id",
  inputSchema: DELETE_PRODUCT_INPUT_SCHEMA,
  execute: async (input, context) => {
    context.logToolCall?.("delete_product", input);
    const parsed = deleteProductSchema.safeParse(input);
    if (!parsed.success) {
      return failure(zodErrorMessage(parsed.error));
    }

    try {
      const api = createProductsApi(context.apiBaseUrl);
      const deleted = await api.deleteProduct(parsed.data.id);
      await syncProductsState(context.apiBaseUrl, context);
      return success("Product deleted successfully", deleted);
    } catch (error) {
      return handleToolError(
        error,
        `Product with id ${parsed.data.id} does not exist`,
      );
    }
  },
};

export const updateProductToolDef: ProductToolDefinition = {
  name: "update_product",
  description: "Update a product by id",
  inputSchema: UPDATE_PRODUCT_INPUT_SCHEMA,
  execute: async (input, context) => {
    context.logToolCall?.("update_product", input);
    const parsed = updateProductSchema.safeParse(input);
    if (!parsed.success) {
      return failure(zodErrorMessage(parsed.error));
    }

    try {
      const { id, ...productInput } = parsed.data;
      const api = createProductsApi(context.apiBaseUrl);
      const updatedProduct = await api.updateProduct(id, productInput as ProductInput);
      await syncProductsState(context.apiBaseUrl, context);
      return success("Product updated successfully", { product: updatedProduct });
    } catch (error) {
      return handleToolError(
        error,
        `Product with id ${parsed.data.id} not found`,
      );
    }
  },
};

export const listProductsToolDef: ProductToolDefinition = {
  name: "list_products",
  description: "List all available products",
  execute: async (_input, context) => {
    context.logToolCall?.("list_products");
    try {
      const api = createProductsApi(context.apiBaseUrl);
      const products = await api.listProducts();
      context.syncProducts?.(products);
      return success("Products fetched successfully", {
        total: products.length,
        products,
      });
    } catch (error) {
      return handleToolError(error, "Unable to refresh products");
    }
  },
};

export const viewProductDetailsToolDef: ProductToolDefinition = {
  name: "view_product_details",
  description: "Navigate to the selected product's detail page using product ID",
  inputSchema: VIEW_PRODUCT_DETAILS_INPUT_SCHEMA,
  execute: async (input, context) => {
    context.logToolCall?.("view_product_details", input);
    const parsed = viewProductDetailsSchema.safeParse(input);
    if (!parsed.success) {
      return failure(zodErrorMessage(parsed.error));
    }

    try {
      const productId = parsed.data.productId;
      const path = `/products/${encodeURIComponent(productId)}`;
      context.navigateToProductDetails?.(productId);
      return success(
        context.navigateToProductDetails
          ? "Navigated to product details page"
          : "Resolved product details route",
        { productId, path },
      );
    } catch (error) {
      return handleToolError(error, "Unable to open product details");
    }
  },
};

export const productTools: ProductToolDefinition[] = [
  addProductToolDef,
  deleteProductToolDef,
  updateProductToolDef,
  listProductsToolDef,
  viewProductDetailsToolDef,
];

export type ProductToolName = (typeof productTools)[number]["name"];
export type { Product, ProductInput };
