import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve GLB monster files from the repo-root monsters/ folder.
// On Render the repo root is process.cwd(); locally it's two levels up.
const monstersDir = path.resolve(process.cwd(), "monsters");
app.use(
  "/monsters",
  express.static(monstersDir, {
    maxAge: "7d",
    setHeaders(res) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  }),
);

app.use("/api", router);

export default app;
