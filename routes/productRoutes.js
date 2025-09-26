const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");

// ✅ Multer memory storage (store file in buffer instead of filesystem)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Add new product (Farmer only + image upload + new fields)
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can add products" });
    }

    const {
      name,
      price,
      quantity,
      contactInfo,
      logisticsAvailable,
      vehicleType,
      logisticsRate,
      producedDate, // ✅ added
      description, // ✅ added
    } = req.body;

    // ✅ Validate mandatory new fields
    if (!producedDate || !description) {
      return res
        .status(400)
        .json({ message: "Produced Date and Description are required" });
    }

    const product = new Product({
      name,
      price,
      quantity,
      contactInfo,
      producedDate,
      description,
      logisticsAvailable: logisticsAvailable || "no",
      vehicleType:
        logisticsAvailable === "yes"
          ? vehicleType
          : "LOGISTICS NOT AVAILABLE",
      logisticsRate: logisticsAvailable === "yes" ? logisticsRate : 0,
      farmer: req.user.id,
    });

    // ✅ If image uploaded → save in MongoDB
    if (req.file) {
      product.imageData = req.file.buffer;
      product.imageType = req.file.mimetype;

      // Keep old field for backward compatibility
      product.image = `/uploads/${Date.now()}-${req.file.originalname}`;
    }

    await product.save();
    res.json({ message: "Product added successfully", product });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ message: "Error adding product" });
  }
});

// ✅ Get all products (for buyers)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().populate("farmer", "name email");
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// ✅ Get only logged-in farmer’s products
router.get("/my-products", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res
        .status(403)
        .json({ message: "Only farmers can view their products" });
    }

    const products = await Product.find({ farmer: req.user.id }).populate(
      "farmer",
      "name email"
    );
    res.json(products);
  } catch (err) {
    console.error("Error fetching farmer products:", err);
    res.status(500).json({ message: "Error fetching farmer products" });
  }
});

// ✅ Delete product (only by the farmer who created it)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res
        .status(403)
        .json({ message: "Only farmers can delete products" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ✅ Ensure only product owner can delete
    if (product.farmer.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You can only delete your own products" });
    }

    await product.deleteOne();

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ message: "Error deleting product" });
  }
});

module.exports = router;
