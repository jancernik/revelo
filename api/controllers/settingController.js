import * as settingService from "../services/settingService.js";

export const getSettings = async (req, res) => {
  const { complete: completeParam } = req.parsedQuery;
  const isAdmin = !!req.user?.admin;
  const complete = completeParam && isAdmin;
  const includeRestricted = isAdmin;

  const settings = await settingService.getSettings({ complete, includeRestricted });

  res.status(200).json({
    data: { settings },
    status: "success"
  });
};

export const getSetting = async (req, res) => {
  const { name } = req.params;
  const { complete: completeParam } = req.parsedQuery;
  const isAdmin = !!req.user?.admin;
  const complete = completeParam && isAdmin;
  const includeRestricted = isAdmin;

  const setting = await settingService.getSetting(name, { complete, includeRestricted });

  res.status(200).json({
    data: { setting },
    status: "success"
  });
};

export const updateSettings = async (req, res) => {
  const { complete } = req.parsedQuery;
  const { settings } = req.body;

  const updatedSettings = await settingService.updateSettings(settings, { complete });

  res.status(200).json({
    data: { settings: updatedSettings },
    status: "success"
  });
};

export const resetSetting = async (req, res) => {
  const { complete } = req.parsedQuery;
  const { name } = req.params;

  const defaultSetting = await settingService.resetSetting(name, { complete });

  res.status(200).json({
    data: { setting: defaultSetting },
    status: "success"
  });
};
