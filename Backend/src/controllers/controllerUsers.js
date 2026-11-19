import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import asyncWrapper from "../middleware/asyncWrapper.js";

import User from "../models/ModelUser.js";
import AppError from "../utils/AppError.js";
import httpStatusText from "../utils/httpStatusText.js";
import generatJwt from "../utils/generatJwt.js";
import cloudinary from "../config/cloudinary.js";
import { destroyImage } from "../utils/cloudinaryHelpers.js";
import userRole, {
  ROLE_VALUES,
  getPermissions,
  canManageRole,
} from "../utils/userRoles.js";
import { TokenBlacklist } from "../models/modelBlackList.js";

const isHttpsProd =
  process.env.NODE_ENV === "production" && !process.env.ELECTRON_APP;

const cookieOption = {
  httpOnly: true,
  secure: isHttpsProd,
  sameSite: isHttpsProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const MIN_PASSWORD = 6;

// ───────────── Helpers ─────────────
const fail = (message, code) =>
  AppError.create(message, code, httpStatusText.ERROR);

const removeAvatar = async (avatar) => {
  await destroyImage(avatar);
};

const reject = async (req, next, message, code) => {
  await removeAvatar(req.uploadedImage);
  return next(fail(message, code));
};

const validPassword = (password) =>
  typeof password === "string" && password.length >= MIN_PASSWORD;

const pick = (obj, fields) =>
  fields.reduce((acc, f) => {
    if (obj[f] !== undefined) acc[f] = obj[f];
    return acc;
  }, {});

const sendWithToken = async (res, user, status = 200) => {
  const token = await generatJwt({
    id: user._id,
    email: user.email,
    role: user.role,
  });
  res.cookie("token", token, cookieOption);
  res.status(status).json({
    status: httpStatusText.SUCCESS,
    data: { user, permissions: getPermissions(user.role) },
  });
};

const getManageableTarget = async (req, includeSalary = false) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw fail("Invalid user id", 400);

  const query = User.findById(id);
  if (includeSalary) query.select("+salary");
  const target = await query;
  if (!target) throw fail("User not found", 404);

  const isSelf = String(target._id) === String(req.currentUser.id);
  if (!isSelf && !canManageRole(req.currentUser.role, target.role)) {
    throw fail("You are not allowed to manage this user", 403);
  }
  return { target, isSelf };
};

// ───────────── Auth ─────────────

const register = asyncWrapper(async (req, res, next) => {
  if ((await User.estimatedDocumentCount()) > 0) {
    return next(
      fail("Setup already completed. Ask the owner for an account", 403),
    );
  }

  const { firstName, lastName, email, password, phone } = req.body;

  if (!validPassword(password)) {
    return next(
      fail(`Password must be at least ${MIN_PASSWORD} characters`, 400),
    );
  }

  const newUser = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password: await bcrypt.hash(password, 12),
    role: userRole.OWNER,
  });

  await sendWithToken(res, newUser, 201);
});

const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(fail("Email and password are required", 400));
  }

  const user = await User.findOne({
    email: String(email).toLowerCase().trim(),
  }).select("+password");

  const match = user && (await bcrypt.compare(password, user.password));
  if (!match) return next(fail("Invalid email or password", 401));

  if (!user.isActive) {
    return next(fail("This account is deactivated. Contact your manager", 403));
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  user.password = undefined;

  await sendWithToken(res, user);
});

const logout = asyncWrapper(async (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (token) {
    await TokenBlacklist.create({
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }
  const { maxAge, ...clearOption } = cookieOption;
  res.clearCookie("token", clearOption);
  res.status(200).json({ status: httpStatusText.SUCCESS, data: null });
});

const getMe = asyncWrapper(async (req, res, next) => {
  const user = await User.findById(req.currentUser.id);
  if (!user || !user.isActive) return next(fail("User not found", 404));

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { user, permissions: getPermissions(user.role) },
  });
});

const updateMe = asyncWrapper(async (req, res, next) => {
  const user = await User.findById(req.currentUser.id);
  if (!user) return reject(req, next, "User not found", 404);

  Object.assign(user, pick(req.body, ["firstName", "lastName", "phone"]));

  let oldAvatar;
  if (req.uploadedImage) {
    oldAvatar = user.avatar;
    user.avatar = req.uploadedImage;
  }

  try {
    await user.save();
  } catch (err) {
    await removeAvatar(req.uploadedImage);
    throw err;
  }
  await removeAvatar(oldAvatar);

  res.status(200).json({ status: httpStatusText.SUCCESS, data: user });
});

const changeMyPassword = asyncWrapper(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !validPassword(newPassword)) {
    return next(
      fail(
        `Current password and a new password (min ${MIN_PASSWORD} chars) are required`,
        400,
      ),
    );
  }

  const user = await User.findById(req.currentUser.id).select("+password");
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return next(fail("Current password is incorrect", 401));
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();

  res.status(200).json({ status: httpStatusText.SUCCESS, data: null });
});

const createUser = asyncWrapper(async (req, res, next) => {
  const actor = req.currentUser;
  const {
    firstName,
    lastName,
    email,
    password,
    phone,
    jobTitle,
    hireDate,
    salary,
    role = userRole.CASHIER,
  } = req.body;

  if (!ROLE_VALUES.includes(role)) {
    return reject(req, next, "Invalid role", 400);
  }

  if (!canManageRole(actor.role, role)) {
    return reject(
      req,
      next,
      "You are not allowed to create a user with this role",
      403,
    );
  }
  if (!validPassword(password)) {
    return reject(
      req,
      next,
      `Password must be at least ${MIN_PASSWORD} characters`,
      400,
    );
  }
  if (await User.findOne({ email: String(email).toLowerCase().trim() })) {
    return reject(req, next, "this user is Exist", 409);
  }

  let newUser;
  try {
    newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      hireDate,
      role,
      password: await bcrypt.hash(password, 12),
      avatar: req.uploadedImage,
      createdBy: actor.id,

      salary: actor.role === userRole.OWNER ? salary : undefined,
    });
  } catch (err) {
    await removeAvatar(req.uploadedImage);
    throw err;
  }

  res.status(201).json({ status: httpStatusText.SUCCESS, data: newUser });
});

const getAllUsers = asyncWrapper(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const { role, isActive, search } = req.query;

  const filter = {};
  if (role && ROLE_VALUES.includes(role)) filter.role = role;
  if (isActive === "true" || isActive === "false") {
    filter.isActive = isActive === "true";
  }
  if (search) {
    const regex = new RegExp(
      String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    status: httpStatusText.SUCCESS,
    data: { users, page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getUserById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return next(fail("Invalid user id", 400));

  const query = User.findById(id);
  if (req.currentUser.role === userRole.OWNER) query.select("+salary");

  const user = await query;
  if (!user) return next(fail("User not found", 404));

  res.status(200).json({ status: httpStatusText.SUCCESS, data: user });
});

const updateUser = asyncWrapper(async (req, res, next) => {
  const actor = req.currentUser;
  const isOwner = actor.role === userRole.OWNER;

  let target, isSelf;
  try {
    ({ target, isSelf } = await getManageableTarget(req, isOwner));
  } catch (err) {
    await removeAvatar(req.uploadedImage);
    throw err;
  }

  if (req.body.role !== undefined && req.body.role !== target.role) {
    if (!isOwner)
      return reject(req, next, "Only the owner can change roles", 403);
    if (isSelf)
      return reject(req, next, "You cannot change your own role", 400);
    if (!ROLE_VALUES.includes(req.body.role)) {
      return reject(req, next, "Invalid role", 400);
    }
    target.role = req.body.role;
  }

  if (req.body.email && req.body.email.toLowerCase().trim() !== target.email) {
    const exists = await User.findOne({
      email: req.body.email.toLowerCase().trim(),
      _id: { $ne: target._id },
    });
    if (exists) return reject(req, next, "this user is Exist", 409);
    target.email = req.body.email;
  }

  Object.assign(
    target,
    pick(req.body, ["firstName", "lastName", "phone", "jobTitle", "hireDate"]),
  );
  if (isOwner && req.body.salary !== undefined) target.salary = req.body.salary;

  let oldAvatar;
  if (req.uploadedImage) {
    oldAvatar = target.avatar;
    target.avatar = req.uploadedImage;
  }

  try {
    await target.save();
  } catch (err) {
    await removeAvatar(req.uploadedImage);
    throw err;
  }
  await removeAvatar(oldAvatar);

  res.status(200).json({ status: httpStatusText.SUCCESS, data: target });
});

const setUserStatus = asyncWrapper(async (req, res, next) => {
  const { isActive } = req.body;
  if (typeof isActive !== "boolean") {
    return next(fail("isActive must be true or false", 400));
  }

  const { target, isSelf } = await getManageableTarget(req);
  if (isSelf)
    return next(fail("You cannot change your own account status", 400));

  target.isActive = isActive;
  target.deactivatedAt = isActive ? undefined : new Date();
  await target.save();

  res.status(200).json({ status: httpStatusText.SUCCESS, data: target });
});

const resetUserPassword = asyncWrapper(async (req, res, next) => {
  const { newPassword } = req.body;
  if (!validPassword(newPassword)) {
    return next(
      fail(`Password must be at least ${MIN_PASSWORD} characters`, 400),
    );
  }

  const { target, isSelf } = await getManageableTarget(req);
  if (isSelf) {
    return next(
      fail("Use the change password endpoint for your own account", 400),
    );
  }

  target.password = await bcrypt.hash(newPassword, 12);
  target.passwordChangedAt = new Date();
  await target.save();

  res.status(200).json({ status: httpStatusText.SUCCESS, data: null });
});

export default {
  register,
  login,
  logout,
  getMe,
  updateMe,
  changeMyPassword,
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  setUserStatus,
  resetUserPassword,
};
