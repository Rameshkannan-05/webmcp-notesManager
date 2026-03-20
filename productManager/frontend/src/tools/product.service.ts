import type { Product, ProductInput } from "./product.types.js";

type ApiEnvelope<TData> = {
  success?: boolean;
  message?: string;
  data?: TData;
};

export class ApiRequestError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return null;
}

function getMessage(payload: unknown, fallback: string): string {
  const maybeMessage = asRecord(payload)?.message;
  return typeof maybeMessage === "string" && maybeMessage.trim()
    ? maybeMessage
    : fallback;
}

function getData(payload: unknown): unknown {
  return asRecord(payload)?.data;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function parseApiResponse<TData>(
  response: Response,
  fallbackErrorMessage: string,
): Promise<ApiEnvelope<TData>> {
  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    throw new ApiRequestError(
      getMessage(payload, fallbackErrorMessage),
      response.status,
      getData(payload),
    );
  }

  return asRecord(payload) as ApiEnvelope<TData>;
}

export function createProductsApi(apiBaseUrl: string) {
  const baseUrl = apiBaseUrl.replace(/\/+$/, "");

  return {
    async listProducts(): Promise<Product[]> {
      const response = await fetch(`${baseUrl}/api/products`);
      const payload = await parseApiResponse<{
        total?: number;
        products?: Product[];
      }>(response, "Failed to fetch products");
      return payload.data?.products ?? [];
    },

    async addProduct(input: ProductInput): Promise<Product> {
      const response = await fetch(`${baseUrl}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await parseApiResponse<{ product?: Product }>(
        response,
        "Failed to add product",
      );
      const product = payload.data?.product;
      if (!product) {
        throw new ApiRequestError("Failed to add product", 500, payload.data);
      }
      return product;
    },

    async updateProduct(id: string, input: ProductInput): Promise<Product> {
      const response = await fetch(`${baseUrl}/api/products/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await parseApiResponse<{ product?: Product }>(
        response,
        `Product with id ${id} not found`,
      );
      const product = payload.data?.product;
      if (!product) {
        throw new ApiRequestError(`Product with id ${id} not found`, 500, payload.data);
      }
      return product;
    },

    async deleteProduct(id: string): Promise<{ id: string }> {
      const response = await fetch(`${baseUrl}/api/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const payload = await parseApiResponse<{ id?: string }>(
        response,
        `Product with id ${id} does not exist`,
      );
      return { id: payload.data?.id ?? id };
    },

    async getProductById(id: string): Promise<Product> {
      const response = await fetch(`${baseUrl}/api/products/${encodeURIComponent(id)}`);
      const payload = await parseApiResponse<{ product?: Product }>(
        response,
        `Product with id ${id} not found`,
      );
      const product = payload.data?.product;
      if (!product) {
        throw new ApiRequestError(`Product with id ${id} not found`, 500, payload.data);
      }
      return product;
    },
  };
}
