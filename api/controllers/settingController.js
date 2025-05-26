import * as settingService from "../services/settingService.js";

export const getSettings = async (req, res) => {
  try {
    const complete = req.query.complete === "true";
    const includeRestricted = !!req.user?.admin;

    const settings = await settingService.getSettings({
      complete,
      includeRestricted
    });

    return res.json(settings);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve settings",
      error: error.message
    });
  }
};

export const getSetting = async (req, res) => {
  try {
    const { name } = req.params;
    const complete = req.query.complete === "true";
    const includeRestricted = !!req.user?.admin;

    const setting = await settingService.getSetting(name, {
      complete,
      includeRestricted
    });

    return res.json(setting);
  } catch (error) {
    return res.status(500).json({
      message: `Failed to retrieve setting '${req.params.name}'`,
      error: error.message
    });
  }
};

export const updateSetting = async (req, res) => {
  try {
    if (!req.user?.admin) {
      return res.status(401).json({ message: "Authorization required" });
    }

    const { name } = req.params;
    const { value } = req.body;

    const result = await settingService.updateSetting(name, value);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: `Failed to update setting '${req.params.name}'`,
      error: error.message
    });
  }
};

export const updateMultipleSettings = async (req, res) => {
  try {
    if (!req.user?.admin) {
      return res.status(401).json({ message: "Authorization required" });
    }

    const settingsData = req.body;

    if (!settingsData || typeof settingsData !== "object") {
      return res.status(400).json({
        message: "Invalid request body. Expected an object with setting names as keys."
      });
    }

    const results = await settingService.updateMultipleSettings(settingsData);

    return res.json({
      message: `Successfully updated ${results.length} settings`,
      settings: results
    });
  } catch (error) {
    if (error.details) {
      return res.status(207).json({
        message: error.message,
        successful: error.details.successful,
        failed: error.details.failed
      });
    }

    return res.status(500).json({
      message: "Failed to update settings",
      error: error.message
    });
  }
};

export const resetSetting = async (req, res) => {
  try {
    if (!req.user?.admin) {
      return res.status(401).json({ message: "Authorization required" });
    }

    const { name } = req.params;
    const result = await settingService.resetSetting(name);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: `Failed to reset setting '${req.params.name}'`,
      error: error.message
    });
  }
};
