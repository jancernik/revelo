import { config } from "../config.js";

export const getConfig = async (req, res) => {
  res.json({
    enableSignups: config.ENABLE_SIGNUPS === "true"
  });
};
