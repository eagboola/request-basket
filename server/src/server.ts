import "./models/env";
import express from "express";
import cors from "cors";
import { Router } from "express";
import { registerHttpRoutes } from './routes/httpRoutes';
import { connectDBs } from "./models/dbConnection";
import path from "path";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

const httpRouter = Router();
registerHttpRoutes(httpRouter);
app.use("/", httpRouter);

// Must be _after_ HTTP routes are mounted.
app.use(express.static(path.resolve(__dirname, "../../front_end/dist")));
app.get("*splat", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../../front_end/dist", "index.html"));
});

async function main() {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
  });

  await connectDBs();

  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  });
}

main();

export default app;
