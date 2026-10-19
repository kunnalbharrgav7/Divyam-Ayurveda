import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Home", "Work", "Other"], default: "Home" },
    isDefault: { type: Boolean, default: false },
  },
  {
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// Internal CRM notes written by staff about a customer (private: stripped from the user's own JSON)
const adminNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    authorName: { type: String, default: "Staff" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      sparse: true,
      unique: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    isStaff: {
      type: Boolean,
      default: false,
      index: true,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    status: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "active",
      index: true,
    },
    addresses: [addressSchema],
    adminNotes: [adminNoteSchema],
    avatarUrl: {
      type: String,
      default: "",
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    // Store credit (from refunds); spendable at checkout
    storeCreditPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    referralCode: {
      type: String,
      sparse: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        delete ret.adminNotes;
        ret.storeCredit = Number(((ret.storeCreditPaise || 0) / 100).toFixed(2));
        return ret;
      },
    },
  }
);

export const User = mongoose.model("User", userSchema);

