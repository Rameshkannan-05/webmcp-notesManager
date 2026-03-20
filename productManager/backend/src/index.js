import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const GEMINI_SYSTEM_PROMPT = `
You are an assistant for a ProductManager app.
Use tools (not regex rules) whenever user intent needs product operations.
Rely on conversation history for context and previously provided values.

When the user asks to add/update/delete/get products:
- Decide the correct tool by understanding the user's request.
- If required tool inputs are missing, ask a concise follow-up for only those missing fields.
- Do not fabricate missing values.
- After successful tool execution, reply in human-readable form (not raw JSON).

Always keep responses concise, friendly, and action-oriented.
`.trim();

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

const productModel =
  mongoose.models.Product || mongoose.model("Product", productSchema);

function validateProductPayload(body) {
  const payload = {
    name: typeof body?.name === "string" ? body.name.trim() : "",
    description:
      typeof body?.description === "string" ? body.description.trim() : "",
    price: Number(body?.price),
    category: typeof body?.category === "string" ? body.category.trim() : "",
    stock: Number(body?.stock),
  };

  if (!payload.name || !payload.description || !payload.category) {
    return {
      valid: false,
      message: "name, description, and category are required",
    };
  }

  if (!Number.isFinite(payload.price) || payload.price < 0) {
    return { valid: false, message: "price must be a non-negative number" };
  }

  if (!Number.isFinite(payload.stock) || payload.stock < 0) {
    return { valid: false, message: "stock must be a non-negative number" };
  }

  return { valid: true, payload };
}

function parseTextField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseNonNegativeNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function buildMissingFieldResult(action, missingFields, invalidFields = []) {
  const missingMessage = missingFields.length
    ? `missing fields: ${missingFields.join(", ")}`
    : "";
  const invalidMessage = invalidFields.length
    ? `invalid fields: ${invalidFields.join(", ")}`
    : "";
  const joiner = missingMessage && invalidMessage ? "; " : "";

  return {
    success: false,
    needs_input: true,
    missing_fields: missingFields,
    invalid_fields: invalidFields,
    message: `To ${action}, I still need ${missingMessage}${joiner}${invalidMessage}.`,
  };
}

function parseProductToolInput(input, options = { requireId: false }) {
  const missingFields = [];
  const invalidFields = [];

  const id = parseTextField(input.id);
  if (options.requireId && !id) {
    missingFields.push("id");
  }

  const name = parseTextField(input.name);
  const description = parseTextField(input.description);
  const category = parseTextField(input.category);
  const price = parseNonNegativeNumber(input.price);
  const stock = parseNonNegativeNumber(input.stock);

  if (!name) {
    missingFields.push("name");
  }
  if (!description) {
    missingFields.push("description");
  }
  if (!category) {
    missingFields.push("category");
  }
  if (input.price === undefined || input.price === null || input.price === "") {
    missingFields.push("price");
  } else if (price === null) {
    invalidFields.push("price");
  }
  if (input.stock === undefined || input.stock === null || input.stock === "") {
    missingFields.push("stock");
  } else if (stock === null) {
    invalidFields.push("stock");
  }

  return {
    hasIssues: missingFields.length > 0 || invalidFields.length > 0,
    missingFields,
    invalidFields,
    id,
    payload: {
      name,
      description,
      category,
      price,
      stock,
    },
  };
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((item) => {
      const role = item?.role === "assistant" ? "model" : "user";
      const content = typeof item?.content === "string" ? item.content.trim() : "";
      return { role, content };
    })
    .filter((item) => item.content.length > 0)
    .map((item) => ({
      role: item.role,
      parts: [{ text: item.content }],
    }));
}

function extractTextFromParts(parts) {
  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function createGeminiTools() {
  return [
    {
      functionDeclarations: [
        {
          name: "listProducts",
          description: "List all products",
          parameters: {
            type: "OBJECT",
            properties: {},
          },
        },
        {
          name: "getProduct",
          description: "Get a product by id or name",
          parameters: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING", description: "MongoDB product id" },
              name: { type: "STRING", description: "Product name" }
            },
            required: [],
          },
        },
        {
          name: "createProduct",
          description: "Create a product",
          parameters: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              description: { type: "STRING" },
              price: { type: "NUMBER" },
              category: { type: "STRING" },
              stock: { type: "NUMBER" },
            },
            required: ["name", "description", "price", "category", "stock"],
          },
        },
        {
          name: "updateProduct",
          description: "Update a product",
          parameters: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              name: { type: "STRING" },
              description: { type: "STRING" },
              price: { type: "NUMBER" },
              category: { type: "STRING" },
              stock: { type: "NUMBER" },
            },
            required: ["id", "name", "description", "price", "category", "stock"],
          },
        },
        {
          name: "deleteProduct",
          description: "Delete a product by id or name",
          parameters: {
            type: "OBJECT",
            properties: {
              id: { type: "STRING" },
              name: { type: "STRING" }
            },
            required: [],
          },
        },
      ],
    },
  ];
}

async function runProductTool(name, args) {
  const input = args && typeof args === "object" ? args : {};

  switch (name) {
    case "listProducts": {
      const products = await productModel
        .find()
        .select("_id name description price category stock createdAt")
        .sort({ createdAt: -1 })
        .lean();
      return {
        success: true,
        data: { total: products.length, products },
      };
    }

    case "getProduct": {
      const id = parseTextField(input.id);
      const name = parseTextField(input.name);

      if (!id && !name) {
        return buildMissingFieldResult("get product details", ["id or name"]);
      }

      const query = id
        ? mongoose.isValidObjectId(id)
          ? { _id: id }
          : null
        : { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };

      if (!query) {
        return { success: false, message: "Invalid product id" };
      }

      const product = await productModel
        .findOne(query)
        .select("_id name description price category stock createdAt")
        .lean();

      if (!product) {
        return { success: false, message: "Product not found" };
      }

      return { success: true, data: { product } };
    }

    case "createProduct": {
      const parsed = parseProductToolInput(input, { requireId: false });
      if (parsed.hasIssues) {
        return buildMissingFieldResult(
          "create a product",
          parsed.missingFields,
          parsed.invalidFields,
        );
      }
      const product = await productModel.create(parsed.payload);
      return { success: true, data: { product } };
    }

    case "updateProduct": {
      const parsed = parseProductToolInput(input, { requireId: true });
      if (parsed.hasIssues) {
        return buildMissingFieldResult(
          "update a product",
          parsed.missingFields,
          parsed.invalidFields,
        );
      }
      if (!mongoose.isValidObjectId(parsed.id)) {
        return { success: false, message: "Invalid product id" };
      }
      const product = await productModel
        .findOneAndUpdate({ _id: parsed.id }, parsed.payload, {
          new: true,
          runValidators: true,
        })
        .select("_id name description price category stock createdAt")
        .lean();

      if (!product) {
        return { success: false, message: "Product not found" };
      }

      return { success: true, data: { product } };
    }

    case "deleteProduct": {
      const id = parseTextField(input.id);
      const name = parseTextField(input.name);

      if (!id && !name) {
        return buildMissingFieldResult("delete a product", ["id or name"]);
      }

      const query = id
        ? mongoose.isValidObjectId(id)
          ? { _id: id }
          : null
        : { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };

      if (!query) {
        return { success: false, message: "Invalid product id" };
      }

      const deleted = await productModel.findOneAndDelete(query).lean();
      if (!deleted) {
        return { success: false, message: "Product not found" };
      }

      return { success: true, data: { id: deleted._id, name: deleted.name } };
    }

    default:
      return { success: false, message: `Unknown tool: ${name}` };
  }
}

async function callGemini(contents) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL,
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        tools: createGeminiTools(),
        systemInstruction: {
          parts: [{ text: GEMINI_SYSTEM_PROMPT }],
        },
      }),
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const apiMessage =
      payload && typeof payload === "object" && payload.error?.message
        ? payload.error.message
        : "Gemini request failed";
    throw new Error(apiMessage);
  }

  return payload;
}

async function generateGeminiResponseWithTools(history, message) {
  const contents = [
    ...normalizeHistory(history),
    { role: "user", parts: [{ text: message }] },
  ];

  for (let i = 0; i < 8; i += 1) {
    const payload = await callGemini(contents);
    const candidateParts = payload?.candidates?.[0]?.content?.parts ?? [];

    const functionCallPart = candidateParts.find((part) => part?.functionCall);
    if (!functionCallPart) {
      const text = extractTextFromParts(candidateParts);
      if (!text) {
        throw new Error("Gemini returned an empty response");
      }
      return text;
    }

    const functionCall = functionCallPart.functionCall;
    const toolName = typeof functionCall?.name === "string" ? functionCall.name : "";
    const toolArgs = functionCall?.args ?? {};

    const toolResult = await runProductTool(toolName, toolArgs);

    contents.push({
      role: "model",
      parts: [{ functionCall: { name: toolName, args: toolArgs } }],
    });

    contents.push({
      role: "user",
      parts: [{ functionResponse: { name: toolName, response: toolResult } }],
    });
  }

  throw new Error("Tool calling exceeded maximum rounds");
}

app.get("/api/health", (_request, response) => {
  response.status(200).json({ success: true, message: "API is running" });
});

const listProducts = async (_request, response) => {
  try {
    const products = await productModel
      .find()
      .select("_id name description price category stock createdAt")
      .sort({ createdAt: -1 })
      .lean();

    response.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: { total: products.length, products },
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

const addProduct = async (request, response) => {
  try {
    const validation = validateProductPayload(request.body);
    if (!validation.valid) {
      response.status(400).json({
        success: false,
        message: validation.message,
        data: null,
      });
      return;
    }

    const product = await productModel.create(validation.payload);

    response.status(201).json({
      success: true,
      message: "Product created successfully",
      data: { product },
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

const updateProduct = async (request, response) => {
  try {
    const { id } = request.params;
    if (!mongoose.isValidObjectId(id)) {
      response.status(400).json({
        success: false,
        message: "Invalid product id",
        data: null,
      });
      return;
    }

    const validation = validateProductPayload(request.body);
    if (!validation.valid) {
      response.status(400).json({
        success: false,
        message: validation.message,
        data: null,
      });
      return;
    }

    const product = await productModel
      .findOneAndUpdate({ _id: id }, validation.payload, {
        new: true,
        runValidators: true,
      })
      .select("_id name description price category stock createdAt")
      .lean();

    if (!product) {
      response.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
      return;
    }

    response.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: { product },
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

const deleteProduct = async (request, response) => {
  try {
    const { id } = request.params;
    if (!mongoose.isValidObjectId(id)) {
      response.status(400).json({
        success: false,
        message: "Invalid product id",
        data: null,
      });
      return;
    }

    const deleted = await productModel.findByIdAndDelete(id).lean();
    if (!deleted) {
      response.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
      return;
    }

    response.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: { id },
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

const getProductById = async (request, response) => {
  try {
    const { id } = request.params;
    if (!mongoose.isValidObjectId(id)) {
      response.status(400).json({
        success: false,
        message: "Invalid product id",
        data: null,
      });
      return;
    }

    const product = await productModel
      .findById(id)
      .select("_id name description price category stock createdAt")
      .lean();

    if (!product) {
      response.status(404).json({
        success: false,
        message: "Product not found",
        data: null,
      });
      return;
    }

    response.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: { product },
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

const productsController = {
  addProduct,
  listProducts,
  updateProduct,
  deleteProduct,
  getProductById,
};

const productsRoutes = express.Router();
productsRoutes.get("/", productsController.listProducts);
productsRoutes.post("/", productsController.addProduct);
productsRoutes.get("/:id", productsController.getProductById);
productsRoutes.put("/:id", productsController.updateProduct);
productsRoutes.delete("/:id", productsController.deleteProduct);

app.use("/api/products", productsRoutes);

app.post("/api/chat", async (request, response) => {
  const message =
    typeof request.body?.message === "string" ? request.body.message.trim() : "";
  const history = request.body?.history;

  if (!message) {
    response.status(400).json({ message: "message is required" });
    return;
  }

  if (!GEMINI_API_KEY) {
    response.status(500).json({ message: "GEMINI_API_KEY is missing in backend/.env" });
    return;
  }

  try {
    const reply = await generateGeminiResponseWithTools(history, message);
    response.status(200).json({ reply });
  } catch (error) {
    console.error("[Chat] Gemini request failed", error);
    response.status(500).json({
      message: error instanceof Error ? error.message : "Chat request failed",
    });
  }
});

async function startServer() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in backend/.env");
    }

    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Products API listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Mongo connection failed:", error);
    process.exit(1);
  }
}

void startServer();

