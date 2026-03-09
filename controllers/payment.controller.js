import Razorpay from "razorpay";
import crypto from "crypto";
import mongoose from "mongoose";
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import Product from "../models/product.model.js";

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay environment variables are missing");
}
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
export const createCheckoutOrder = async (req, res) => {
  try {
    const { products: clientProducts, couponCode } = req.body;

    if (!Array.isArray(clientProducts) || clientProducts.length === 0) {
      return res.status(400).json({ message: "No products provided" });
    }
    const productIds = clientProducts.map((p) => p._id);
    const dbProducts = await Product.find({ _id: { $in: productIds } });

    if (dbProducts.length !== clientProducts.length) {
      return res.status(400).json({ message: "Invalid product detected" });
    }

    let totalAmount = 0;
    clientProducts.forEach((item) => {
      const dbProduct = dbProducts.find(
        (p) => p._id.toString() === item._id
      );

      if (!dbProduct) {
        throw new Error("Product mismatch");
      }

      if (!item.quantity || item.quantity <= 0) {
        throw new Error("Invalid quantity");
      }

      totalAmount += dbProduct.price * item.quantity * 100;
    });

    let discount = 0;
    let coupon = null;

    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        userId: req.user._id,
        isActive: true,
      });

      if (coupon) {
        discount = Math.round(
          (totalAmount * coupon.discountPercentage) / 100
        );
        totalAmount -= discount;
      }
    }

    const receipt = `ord_${req.user._id
      .toString()
      .slice(-6)}_${Date.now().toString().slice(-6)}`;

    const order = await razorpay.orders.create({
      amount: totalAmount,
      currency: "INR",
      receipt,
      notes: {
        userId: req.user._id.toString(),
        coupon: couponCode || "none",
      },
    });

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      discount,
      receipt,
    });
  } catch (error) {
    console.error("Create checkout error:", error);
    res.status(500).json({ message: error.message || "Checkout failed" });
  }
};
export const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      products,
      couponCode,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      throw new Error("Missing Razorpay parameters");
    }
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }
    const existingOrder = await Order.findOne(
      { razorpayPaymentId: razorpay_payment_id },
      null,
      { session }
    );

    if (existingOrder) {
      await session.commitTransaction();
      return res.json({
        success: true,
        orderId: existingOrder._id,
        message: "Order already processed",
      });
    }
    const productIds = products.map((p) => p._id);
    const dbProducts = await Product.find(
      { _id: { $in: productIds } },
      null,
      { session }
    );

    let totalAmount = 0;
    const orderProducts = [];

    for (const item of products) {
      const product = dbProducts.find(
        (p) => p._id.toString() === item._id
      );

      if (!product) {
        throw new Error("Product not found");
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      product.stock -= item.quantity;
      await product.save({ session });

      totalAmount += product.price * item.quantity;

      orderProducts.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    const order = await Order.create(
      [
        {
          user: req.user._id,
          products: orderProducts,
          totalAmount,
          paymentStatus: "PAID",
          orderStatus: "PLACED",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          discountApplied: couponCode || null,
        },
      ],
      { session }
    );
    if (couponCode) {
      await Coupon.findOneAndUpdate(
        { code: couponCode, userId: req.user._id },
        { isActive: false },
        { session }
      );
    }

    await session.commitTransaction();

    res.json({
      success: true,
      message: "Payment verified & order placed",
      orderId: order[0]._id,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Payment verification error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};



