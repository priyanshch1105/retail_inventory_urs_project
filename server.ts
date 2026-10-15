import "dotenv/config";
import next from "next";
import { connectDatabase } from "./server/config/database";
import { env } from "./server/config/env";
import { createApp } from "./server/app";
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();
nextApp.prepare().then(async () => { await connectDatabase(); const app = createApp(); app.all("*", (req, res) => handle(req, res)); app.listen(env.port, "0.0.0.0", () => console.log(`Retail Inventory listening on ${env.port}`)); }).catch((error: unknown) => { console.error(error); process.exit(1); });
