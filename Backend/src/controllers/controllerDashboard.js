import asyncWrapper from "../middleware/asyncWrapper.js";
import { getSettings } from "../services/settingsService.js";
import { getOverview, getLowStock } from "../services/reportService.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import { parseDateRange } from "../utils/queryHelpers.js";
import { zonedDayRange } from "../utils/timezone.js";


const getDashboard = asyncWrapper(async (req, res, next) => {
  const { timezone } = await getSettings();

  let range;
  if (req.query.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date))
      return next(fail("date must be YYYY-MM-DD", 400));
    range = zonedDayRange(req.query.date, timezone);
  } else {
    range = parseDateRange(req.query, 30);
  }
  if (range.from > range.to)
    return next(fail("'from' must be before 'to'", 400));

  send(res, await getOverview({ ...range, timezone }));
});

const getNotifications = asyncWrapper(async (_req, res) => {
  send(res, { lowStock: await getLowStock() });
});

export default { getDashboard, getNotifications };
