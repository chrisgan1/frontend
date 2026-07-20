import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { controlsRouter } from "./routes/controls.js";
import { evidenceRouter } from "./routes/evidence.js";
import { policiesRouter } from "./routes/policies.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { auditRouter } from "./routes/audit.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api", controlsRouter);
app.use("/api", evidenceRouter);
app.use("/api", policiesRouter);
app.use("/api", dashboardRouter);
app.use("/api", auditRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT) || 3001;
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`Server listening on :${port}`));
}
