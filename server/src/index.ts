import "dotenv/config";
import express from "express";
// Express 4 doesn't forward rejected promises from async route handlers to
// the error middleware below — an unexpected error in any endpoint would
// otherwise crash the whole process instead of returning a 500. Must be
// imported before any router registers its routes.
import "express-async-errors";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { documentsRouter } from "./routes/documents.js";
import { certificationsRouter } from "./routes/certifications.js";
import { employeesRouter } from "./routes/employees.js";
import { projectsRouter } from "./routes/projects.js";
import { companyProfileRouter } from "./routes/company-profile.js";
import { passportRouter } from "./routes/passport.js";
import { requestsRouter } from "./routes/requests.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { auditRouter } from "./routes/audit.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api", documentsRouter);
app.use("/api", certificationsRouter);
app.use("/api", employeesRouter);
app.use("/api", projectsRouter);
app.use("/api", companyProfileRouter);
app.use("/api", passportRouter);
app.use("/api", requestsRouter);
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
