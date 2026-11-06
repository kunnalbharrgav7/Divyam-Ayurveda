import mongoose from "mongoose";

const contactEnquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "" },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["New", "In Progress", "Replied", "Resolved", "Archived"], default: "New", index: true },
    adminNotes: { type: String, default: "" },
    // The signed-in customer who sent it, when there was one
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    // Staff replies kept on the enquiry (there is no email sending, so the team contacts the person by email or phone)
    replies: [
      {
        message: { type: String, required: true, maxlength: 2000 },
        staffName: { type: String, default: "Staff" },
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

export const ContactEnquiry = mongoose.model("ContactEnquiry", contactEnquirySchema);

