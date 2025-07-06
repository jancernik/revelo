import "./drizzle/migrate.js";
import { config } from "./config.js";
import { createApi } from "./createApi.js";
import { migrateDb } from "./drizzle/migrate.js";

const init = async () => {
  await migrateDb();
  const app = createApi({
    enableLogging: true,
    uploadsDir: "uploads"
  });

  app.listen(config.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server is running on port ${config.PORT}`);
  });
};

init();
