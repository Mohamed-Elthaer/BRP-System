export const money = (n, currency = "EGP") =>
  new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(n) || 0);

export const num = (n, d = 2) => new Intl.NumberFormat("en", { maximumFractionDigits: d }).format(Number(n) || 0);

export const dt = (d) => (d ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d)) : "—");
export const dOnly = (d) => (d ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(d)) : "—");
export const timeOnly = (d) => (d ? new Intl.DateTimeFormat("en", { timeStyle: "short" }).format(new Date(d)) : "—");

export const minutesSince = (d) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 60000));
export const todayYMD = (tz) => new Date().toLocaleDateString("en-CA", tz ? { timeZone: tz } : undefined);
export const daysAgoISO = (n) => new Date(Date.now() - n * 86400000).toISOString();
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export const uuid = () =>
  crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const fullName = (u) => (u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "");
export const initials = (u) => `${u?.firstName?.[0] || ""}${u?.lastName?.[0] || ""}`.toUpperCase() || "?";
export const clean = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null));
