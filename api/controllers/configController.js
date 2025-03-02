import Setting from "../models/Setting.js";

export const getConfig = async (req, res) => {
  const enableSignups = await Setting.get("enableSignups");

  res.json({
    enableSignups
  });
};
