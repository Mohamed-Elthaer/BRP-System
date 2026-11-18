
export const zonedDayRange = (ymd, timeZone) => {
  const guess = new Date(`${ymd}T00:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(guess);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  const from = new Date(guess.getTime() - (asUTC - guess.getTime()));
  return { from, to: new Date(from.getTime() + 86400000 - 1) };
};

export const todayYMD = (timeZone) =>
  new Date().toLocaleDateString("en-CA", { timeZone });

export const isValidTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};
