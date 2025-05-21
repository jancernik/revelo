import "./drizzle/migrate.js";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorMiddleware.js";
import { config } from "./config.js";
import fs from "fs";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use(cors({ origin: config.CLIENT_BASE_URL, credentials: true }));

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
