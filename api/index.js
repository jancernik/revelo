import "./drizzle/migrate.js";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";
import configRoutes from "./routes/configRoutes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorMiddleware.js";
import { config } from "./config.js";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.use(cors({ origin: config.CLIENT_BASE_URL, credentials: true }));

app.use(authRoutes);
app.use(imageRoutes);
app.use(configRoutes);

app.use("/uploads", express.static("uploads"));

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port ${config.PORT}`);
});
