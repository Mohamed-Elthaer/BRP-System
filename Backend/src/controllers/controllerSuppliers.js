import asyncWrapper from "../middleware/asyncWrapper.js";
import Supplier from "../models/modelSupplier.js";
import { fail } from "../utils/fail.js";
import { send } from "../utils/respond.js";
import { assertId, pick, escapeRegex } from "../utils/queryHelpers.js";
import logActivity, { ACTIONS } from "../utils/logActivity.js";

const FIELDS = ["name", "phone", "email", "address", "notes", "isActive"];

const getSuppliers = asyncWrapper(async (req, res) => {
  const filter = {};
  if (req.query.active === "true") filter.isActive = true;
  if (req.query.search)
    filter.name = new RegExp(escapeRegex(req.query.search), "i");
  send(res, await Supplier.find(filter).sort({ name: 1 }));
});

const getSupplier = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return next(fail("Supplier not found", 404));
  send(res, supplier);
});

const createSupplier = asyncWrapper(async (req, res, next) => {
  const data = pick(req.body, FIELDS);
  if (await Supplier.exists({ name: data.name }))
    return next(fail("Supplier already exists", 409));
  const supplier = await Supplier.create(data);
  await logActivity({
    req,
    action: ACTIONS.SUPPLIER_CHANGE,
    entity: "Supplier",
    entityId: supplier._id,
    details: { op: "create", name: supplier.name },
  });
  send(res, supplier, 201);
});

const updateSupplier = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return next(fail("Supplier not found", 404));
  const data = pick(req.body, FIELDS);
  if (
    data.name &&
    data.name !== supplier.name &&
    (await Supplier.exists({ name: data.name }))
  ) {
    return next(fail("Supplier already exists", 409));
  }
  Object.assign(supplier, data);
  await supplier.save();
  await logActivity({
    req,
    action: ACTIONS.SUPPLIER_CHANGE,
    entity: "Supplier",
    entityId: supplier._id,
    details: { op: "update", changes: data },
  });
  send(res, supplier);
});

const deactivateSupplier = asyncWrapper(async (req, res, next) => {
  assertId(req.params.id);
  const supplier = await Supplier.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true },
  );
  if (!supplier) return next(fail("Supplier not found", 404));
  await logActivity({
    req,
    action: ACTIONS.SUPPLIER_CHANGE,
    entity: "Supplier",
    entityId: supplier._id,
    details: { op: "deactivate" },
  });
  send(res, supplier);
});

export default {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
};
