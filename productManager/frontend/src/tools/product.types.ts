import type { ZodRawShape } from "zod";

export type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  createdAt?: string;
};

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
};

export type ToolExecutionResult = {
  success: boolean;
  message: string;
  data: unknown;
};

export type ProductToolsContext = {
  apiBaseUrl: string;
  logToolCall?: (toolName: string, params?: unknown) => void;
  syncProducts?: (products: Product[]) => void;
  navigateToProductDetails?: (productId: string) => void;
};

export type ProductToolDefinition = {
  name: string;
  description: string;
  inputSchema?: ZodRawShape;
  execute: (
    input: unknown,
    context: ProductToolsContext,
  ) => Promise<ToolExecutionResult>;
};
