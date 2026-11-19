import mongoose from "mongoose";

let supportsTransactions = true;

export const runInTransaction = async (fn) => {
  if (!supportsTransactions) {
    return fn(null);
  }

  let session;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    const msg = String(err?.message || "");
    if (
      err?.code === 20 ||
      msg.includes("Transaction numbers are only allowed on a replica set") ||
      msg.includes("Transactions are not supported")
    ) {
      supportsTransactions = false;
      return fn(null);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
};
