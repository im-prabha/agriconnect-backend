// models/Product.js
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true }, // per kg
    quantity: { type: Number, required: true }, // in kg
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // kept for backward compatibility (previously you saved a path like "/uploads/xxx")
    image: { type: String },

    // New: store image binary directly in MongoDB (optional — use either imageData or image)
    imageData: { type: Buffer }, // binary image
    imageType: { type: String }, // mime type, e.g. "image/png"

    // ➕ Extra fields
    contactInfo: { type: String, required: true },
    logisticsAvailable: { type: String, enum: ["yes", "no"], default: "no" },
    vehicleType: { type: String, default: "LOGISTICS NOT AVAILABLE" },
    logisticsRate: { type: Number, default: 0 }, // ₹ per km

    // ✅ Newly added
    producedDate: { type: Date, required: true },
    description: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // include virtuals when converting to JSON
    toObject: { virtuals: true },
  }
);

// Virtual: imageSrc (frontend-friendly)
// - If imageData + imageType exist -> return data:...base64 URL
// - Else if image (string path or full url) exists -> return it (preserve previous behavior)
// - Else -> null
ProductSchema.virtual("imageSrc").get(function () {
  if (this.imageData && this.imageType) {
    try {
      return `data:${this.imageType};base64,${this.imageData.toString("base64")}`;
    } catch (e) {
      return null;
    }
  }

  if (this.image && typeof this.image === "string") {
    // if it's already a full URL or starts with /, return as-is
    if (this.image.startsWith("http://") || this.image.startsWith("https://") || this.image.startsWith("/")) {
      return this.image;
    }
    // otherwise assume filename and return uploads path (fallback)
    return `/uploads/${this.image}`;
  }

  return null;
});

module.exports = mongoose.model("Product", ProductSchema);
