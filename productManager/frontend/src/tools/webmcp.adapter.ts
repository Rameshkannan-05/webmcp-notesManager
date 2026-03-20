import type {
  ProductToolDefinition,
  ProductToolsContext,
} from "./product.types.js";

export function toWebMcpTool(
  toolDef: ProductToolDefinition,
  context: ProductToolsContext,
) {
  return {
    name: toolDef.name,
    description: toolDef.description,
    inputSchema: toolDef.inputSchema,
    handler: async (input: unknown) => toolDef.execute(input, context),
  };
}
