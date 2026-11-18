import Settings from "../models/modelSettings.js";

export const getSettings = (session) =>
  Settings.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: { key: "main" } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session },
  );