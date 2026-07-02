import "dotenv/config";
import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { nanoid } from "nanoid";
import { seedState } from "./seed-data.js";

const app = express();
const port = Number(process.env.PORT || 8080);
const corsOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS_ORIGINS.`));
  }
}));

const appStateSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: true, default: "primary" },
    state: { type: mongoose.Schema.Types.Mixed, required: true },
    revision: { type: String, required: true, default: () => nanoid() }
  },
  { timestamps: true, minimize: false }
);

const AppState = mongoose.model("AppState", appStateSchema);

async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required. Use a MongoDB Atlas connection string.");
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000
  });
}

function cleanState(input) {
  const state = JSON.parse(JSON.stringify(input || {}));
  state.session = null;
  state.view = "login";
  state.activeOrderId = null;
  state.activeCustomerId = null;
  state.selectedProductId = null;
  state.editingProductId = null;
  state.cart = [];
  return state;
}

async function getStateDocument() {
  const existing = await AppState.findOne({ key: "primary" }).lean();
  if (existing) return existing;
  const created = await AppState.create({ key: "primary", state: cleanState(seedState) });
  return created.toObject();
}

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "lensflow-oms-api",
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting"
  });
});

app.get("/api/state", async (_request, response, next) => {
  try {
    const doc = await getStateDocument();
    response.json(doc.state);
  } catch (error) {
    next(error);
  }
});

app.put("/api/state", async (request, response, next) => {
  try {
    if (!request.body?.state || typeof request.body.state !== "object") {
      response.status(400).json({ error: "A state object is required." });
      return;
    }
    const nextState = cleanState(request.body.state);
    const doc = await AppState.findOneAndUpdate(
      { key: "primary" },
      { $set: { state: nextState, revision: nanoid() } },
      { upsert: true, new: true, lean: true }
    );
    response.json({ ok: true, revision: doc.revision, updatedAt: doc.updatedAt });
  } catch (error) {
    next(error);
  }
});

app.post("/api/reset-seed", async (_request, response, next) => {
  try {
    if (process.env.ALLOW_SEED_RESET !== "true") {
      response.status(403).json({ error: "Seed reset is disabled." });
      return;
    }
    const doc = await AppState.findOneAndUpdate(
      { key: "primary" },
      { $set: { state: cleanState(seedState), revision: nanoid() } },
      { upsert: true, new: true, lean: true }
    );
    response.json({ ok: true, revision: doc.revision });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
});

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`LensFlow OMS API listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to start API server.", error);
    process.exit(1);
  });
