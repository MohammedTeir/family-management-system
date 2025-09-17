import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../../src/routes.js";
import cors from "cors";
import serverless from "serverless-http";

const app = express();

// CORS configuration for cross-origin deployment
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Initialize routes
let serverInitialized = false;
let serverPromise: Promise<any>;

const initializeServer = async () => {
  if (!serverInitialized) {
    serverPromise = registerRoutes(app);
    serverInitialized = true;
  }
  return serverPromise;
};

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  throw err;
});

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  await initializeServer();
  const serverlessHandler = serverless(app);
  return serverlessHandler(event, context);
};

export { handler };