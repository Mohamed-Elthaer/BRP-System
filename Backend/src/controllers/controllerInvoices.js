import asyncWrapper from "../middleware/asyncWrapper.js";
import Invoice from "../models/modelInvoice.js";
import userRole from "../utils/userRoles.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import {
  assertId,
  escapeRegex,
  getPagination,
  pageMeta,
  parseDateRange,
} from "../utils/queryHelpers.js";

const scope = (user) =>
  user.role === userRole.CASHIER ? { issuedBy: user.id } : {};

const getInvoices = asyncWrapper(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { ...scope(req.currentUser) };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.from || req.query.to) {
    const { from, to } = parseDateRange(req.query);
    filter.createdAt = { $gte: from, $lte: to };
  }
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ invoiceNumber: rx }, { orderNumber: rx }];
  }

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .select("-lines")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments(filter),
  ]);
  send(res, { invoices, ...pageMeta(page, limit, total) });
});

const getInvoice = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id, "invoice id");
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    ...scope(req.currentUser),
  });
  if (!invoice) return next(fail("Invoice not found", 404));
  send(res, invoice);
});

const getInvoiceByOrder = asyncWrapper(async (req, res, next) => {
  assertId(req.params.orderId, "order id");
  const invoice = await Invoice.findOne({
    order: req.params.orderId,
    ...scope(req.currentUser),
  });
  if (!invoice)
    return next(fail("Invoice not found. The order may be unpaid", 404));
  send(res, invoice);
});

export default { getInvoices, getInvoice, getInvoiceByOrder };
