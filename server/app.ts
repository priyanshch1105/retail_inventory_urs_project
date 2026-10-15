import express from "express";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import { corsHeaders, errorHandler, securityHeaders } from "./middleware/http.middleware";
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import stockRoutes from "./routes/stock.routes";
import saleRoutes from "./routes/sale.routes";
import reportRoutes from "./routes/report.routes";
import userRoutes from "./routes/user.routes";
import settingsRoutes from "./routes/settings.routes";
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(corsHeaders);
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "retail-inventory" }));
  app.get("/api-docs/openapi.yaml", (_req, res, next) => {
    res.sendFile(path.resolve(process.cwd(), "docs/openapi.yaml"), (error) => {
      if (error) next(error);
    });
  });
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      explorer: true,
      customSiteTitle: "Retail Inventory API Docs",
      swaggerOptions: { url: "/api-docs/openapi.yaml", persistAuthorization: true },
    }),
  );

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/inventory", stockRoutes);
  app.use("/api/sales", saleRoutes);
  app.use("/api/reports", reportRoutes);
  app.use(errorHandler);
  return app;
}
