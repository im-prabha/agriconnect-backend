const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected","cancelled"],
      default: "pending",
    },

    // 🔑 Snapshot fields (extra info at order time)
    farmerName: { type: String, required: true },
    farmerContact: { type: String, required: true },
    logisticsAvailable: { type: String, enum: ["yes", "no"], default: "no" },
    vehicleType: { type: String, default: "LOGISTICS NOT AVAILABLE" },
    logisticsRate: { type: Number, default: 0 },

    // ✅ New field for buyer’s mobile number
    buyerContact: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Invalid mobile number. Must be 10 digits"], // validation
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
