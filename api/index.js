import "./drizzle/migrate.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import fs from "fs";
import morgan from "morgan";

import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use(cors({ credentials: true, origin: config.CLIENT_BASE_URL }));

app.use(authRoutes);
app.use(settingRoutes);
app.use(imageRoutes);

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}

app.use("/uploads", express.static("uploads"));

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port ${config.PORT}`);
});
