// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const Product = require("../models/Product");

// ✅ Place an order (Buyer only)
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can place orders" });
    }

    const { productId, quantity, buyerContact } = req.body;
    const qty = parseInt(quantity, 10);

    // ✅ Validate inputs
    if (!productId || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: "Invalid product or quantity" });
    }

    // ✅ Validate mobile number
    if (!buyerContact || !/^[0-9]{10}$/.test(buyerContact)) {
      return res
        .status(400)
        .json({ message: "Invalid buyer mobile number. Must be 10 digits" });
    }

    // ✅ Check stock but don't decrement yet
    const product = await Product.findById(productId).populate(
      "farmer",
      "name email"
    );
    if (!product || product.quantity < qty) {
      return res.status(400).json({ message: "Insufficient stock" });
    }

    const order = new Order({
      buyer: new mongoose.Types.ObjectId(req.user.id),
      farmer: new mongoose.Types.ObjectId(product.farmer._id),
      product: product._id,
      quantity: qty,
      totalPrice: Number(product.price) * qty,
      status: "pending",

      // ✅ Snapshot fields
      farmerName: product.farmer?.name || "Unknown",
      farmerContact: product.contactInfo || "N/A",
      logisticsAvailable: product.logisticsAvailable || "no",
      vehicleType: product.vehicleType || "LOGISTICS NOT AVAILABLE",
      logisticsRate: product.logisticsRate || 0,

      // ✅ New field (saved in DB)
      buyerContact,
    });

    await order.save();
    res.json({ message: "Order placed successfully", order });
  } catch (err) {
    console.error("Order error:", err);
    res.status(500).json({ message: "Error placing order" });
  }
});

// ✅ Get buyer's orders
router.get("/buyer", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can view their orders" });
    }

    const orders = await Order.find({ buyer: req.user.id })
      .populate("product", "name price producedDate description")
      .populate("farmer", "name email");

    res.json(orders);
  } catch (err) {
    console.error("Error fetching buyer orders:", err);
    res.status(500).json({ message: "Error fetching buyer orders" });
  }
});

// ✅ Get farmer's orders
router.get("/farmer", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can view their orders" });
    }

    const orders = await Order.find({ farmer: req.user.id })
      .populate("product", "name price producedDate description")
      .populate("buyer", "name email");

    res.json(orders);
  } catch (err) {
    console.error("Error fetching farmer orders:", err);
    res.status(500).json({ message: "Error fetching farmer orders" });
  }
});

// ✅ Update order status (Farmer only)
router.put("/:id/status", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "farmer") {
      return res.status(403).json({ message: "Only farmers can update order status" });
    }

    const { status } = req.body;
    if (!["pending", "accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findOne({ _id: req.params.id, farmer: req.user.id })
      .populate("product");

    if (!order) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }

    // ✅ If status is changing
    if (order.status !== status) {
      // If moving to accepted → reduce stock
      if (status === "accepted") {
        const product = await Product.findById(order.product._id);
        if (!product || product.quantity < order.quantity) {
          return res.status(400).json({ message: "Insufficient stock at acceptance" });
        }
        product.quantity -= order.quantity;
        await product.save();
      }

      // If moving from accepted → rejected → restore stock
      if (order.status === "accepted" && status === "rejected") {
        const product = await Product.findById(order.product._id);
        if (product) {
          product.quantity += order.quantity;
          await product.save();
        }
      }
    }

    order.status = status;
    await order.save();

    res.json({ message: "Order status updated", order });
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({ message: "Error updating order status" });
  }
});

// ✅ Cancel an order (Buyer only)
router.delete("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can cancel orders" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // ✅ Ensure only the owner can cancel
    if (order.buyer.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to cancel this order" });
    }

    // ✅ Prevent cancelling accepted/rejected orders
    if (["accepted", "rejected"].includes(order.status)) {
      return res.status(400).json({ message: "Cannot cancel an accepted or rejected order" });
    }

    order.status = "cancelled";
    await order.save();

    res.json({ message: "Order cancelled successfully", order });
  } catch (err) {
    console.error("Cancel order error:", err);
    res.status(500).json({ message: "Error cancelling order" });
  }
});

module.exports = router;
