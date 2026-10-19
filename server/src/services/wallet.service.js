import { User } from "../models/User.js";
import { WalletTransaction } from "../models/WalletTransaction.js";
import { ApiError } from "../utils/apiError.js";

/**
 * The only place that changes a customer's store credit. Every change is written to the ledger,
 * and a movement carrying an idempotencyKey is applied at most once however often it is retried.
 */
export class WalletService {
  async balance(userId) {
    const user = await User.findById(userId).select("storeCreditPaise").lean();
    return user?.storeCreditPaise || 0;
  }

  // Claims the idempotency key first (unique index), so a retry or race cannot move money twice.
  async #claim(userId, type, amountPaise, { source, reference = "", note = "", key = null }) {
    try {
      return { tx: await WalletTransaction.create({ userId, type, amountPaise, source, reference, note, idempotencyKey: key }) };
    } catch (err) {
      if (err?.code === 11000 && key) return { duplicate: await WalletTransaction.findOne({ idempotencyKey: key }) };
      throw err;
    }
  }

  async credit(userId, amountPaise, opts) {
    if (!userId || !Number.isInteger(amountPaise) || amountPaise <= 0) return null;
    const { tx, duplicate } = await this.#claim(userId, "credit", amountPaise, opts);
    if (duplicate) return duplicate;
    const user = await User.findByIdAndUpdate(userId, { $inc: { storeCreditPaise: amountPaise } }, { new: true });
    if (!user) {
      await tx.deleteOne();
      throw ApiError.notFound("Customer account not found.");
    }
    tx.balanceAfterPaise = user.storeCreditPaise;
    await tx.save();
    return tx;
  }

  /**
   * Takes credit away. By default the balance must cover it (409 otherwise); with `partial` it takes
   * whatever is available up to the amount (used to claw back a reward the customer already spent).
   */
  async debit(userId, amountPaise, opts, { partial = false } = {}) {
    if (!userId || !Number.isInteger(amountPaise) || amountPaise <= 0) return null;
    let take = amountPaise;
    if (partial) {
      take = Math.min(amountPaise, await this.balance(userId));
      if (take <= 0) return null;
    }
    const { tx, duplicate } = await this.#claim(userId, "debit", take, opts);
    if (duplicate) return duplicate;
    const user = await User.findOneAndUpdate(
      { _id: userId, storeCreditPaise: { $gte: take } },
      { $inc: { storeCreditPaise: -take } },
      { new: true }
    );
    if (!user) {
      await tx.deleteOne();
      if (partial) return null;
      throw ApiError.conflict("Your store credit balance is lower than the amount you tried to use.");
    }
    tx.balanceAfterPaise = user.storeCreditPaise;
    await tx.save();
    return tx;
  }

  async history(userId, limit = 50) {
    const rows = await WalletTransaction.find({ userId }).sort({ createdAt: -1 }).limit(limit);
    return rows.map((r) => r.toJSON());
  }
}

export const walletService = new WalletService();
