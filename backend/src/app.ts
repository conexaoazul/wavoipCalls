import "./bootstrap";
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import process from "process";
import routes from "./routes";
import { isDatabaseReady } from "./database";
const app = express();
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3001"
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"],
    },
  },
}));

app.use(cookieParser());

const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || "1mb";
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));

app.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health/ready', (_req: Request, res: Response) => {
  if (!isDatabaseReady()) {
    return res.status(503).json({ status: 'not_ready' });
  }
  return res.status(200).json({ status: 'ready' });
});

// Guarda global: toda rota /api exige Bearer == JWT_SECRET (mesma regra do
// AuthController.validateToken). Protege rotas de user/tenant/call/tokens que
// antes ficavam abertas.
app.use("/api", (req: Request, res: Response, next: () => void) => {
  const token = (req.headers["authorization"] || "").split(" ")[1];
  if (!process.env.JWT_SECRET || token !== process.env.JWT_SECRET) {
    res.status(401).json({ valid: false, message: "Token inválido" });
    return;
  }
  next();
});

app.use('/api', routes);

app.get("/", (req: Request, res: Response) => {
  res.send("App is running!");
});

export default app;