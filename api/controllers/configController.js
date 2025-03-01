import Setting from "../models/SettingModel.js";

export const getConfig = async (req, res) => {
  const enableSignups = await Setting.get("enableSignups");

  res.json({
    enableSignups
  });
};
