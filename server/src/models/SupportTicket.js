import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, default: "" },
    orderNumber: { type: String, default: "" },
    subject: { type: String, required: true },
    category: { type: String, default: "General" },
    priority: { type: String, enum: ["Low", "Normal", "High", "Urgent"], default: "Normal" },
    status: { type: String, enum: ["Open", "In Progress", "Resolved", "Closed"], default: "Open", index: true },
    messages: [
      {
        sender: { type: String, required: true },
        senderRole: { type: String, default: "customer" },
        message: { type: String, required: true },
        time: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);

