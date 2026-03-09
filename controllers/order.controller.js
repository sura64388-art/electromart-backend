import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
  try {
    const {
      products,
      deliveryAddress,
      paymentMethod = "ONLINE",
      shippingMethod,
      couponCode,
      notes,
    } = req.body;


    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        message: "Products are required",
      });
    }

    let subtotal = 0;
    const productDetails = [];

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          message: `Product ${item.productId} not found`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      productDetails.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        size: item.size,
        color: item.color,
      });
    }

    // Calculate shipping
    let shippingCost = 0;
    if (shippingMethod === "STANDARD") shippingCost = 49;
    else if (shippingMethod === "EXPRESS") shippingCost = 99;
    else if (shippingMethod === "SAME_DAY") shippingCost = 199;

    // Calculate tax (18% GST only for purchases above 20,000)
    const taxRate = subtotal >= 20000 ? 0.18 : 0;
    const taxAmount = subtotal * taxRate;

    // Apply discount if any
    const discountAmount = couponCode ? subtotal * 0.1 : 0; // 10% discount example

    // Calculate final amount
    const finalAmount = subtotal + shippingCost + taxAmount - discountAmount;

    // Validate delivery address
    if (!deliveryAddress) {
      return res.status(400).json({
        message: "Delivery address is required",
      });
    }

    const {
      street,
      city,
      state,
      pincode,
      country = "India",
      landmark = "",
      phone,
      fullName
    } = deliveryAddress;

    if (!street || !city || !state || !pincode || !phone || !fullName) {
      return res.status(400).json({
        message: "Complete delivery address is required",
      });
    }

    // Create order in database
    const order = new Order({
      user: req.user._id,
      products: productDetails,
      totalAmount: subtotal,
      shippingCost,
      taxAmount,
      discountAmount,
      finalAmount,
      deliveryAddress: {
        street,
        city,
        state,
        country,
        pincode,
        landmark,
        phone,
        fullName,
      },
      paymentMethod,
      paymentStatus: paymentMethod === "COD" ? "PENDING" : "PENDING",
      orderStatus: "PLACED",
      shippingMethod,
      ...(couponCode && { couponCode }),
      ...(notes && { notes }),
    });

    await order.save();

    // Update product stock
    for (const item of products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }

    // If COD, return success immediately
    if (paymentMethod === "COD") {
      return res.status(201).json({
        success: true,
        message: "Order placed successfully (Cash on Delivery)",
        order: await Order.findById(order._id).populate("products.product"),
        paymentRequired: false,
      });
    }

    // For online payment, return order details for payment initiation
    res.status(201).json({
      success: true,
      message: "Order created. Proceed to payment.",
      order: await Order.findById(order._id).populate("products.product"),
      paymentRequired: true,
      orderId: order._id,
      amount: finalAmount * 100,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// Add these payment functions
export const initiatePayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount),
      currency: "INR",
      receipt: `order_${orderId}`,
      notes: {
        userId: req.user._id.toString(),
        orderId: orderId.toString(),
      },
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      orderId,
      userName: req.user.name,
      userEmail: req.user.email,
      userPhone: order.deliveryAddress.phone,
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({
      message: "Failed to initiate payment",
      error: error.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderId,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpay_signature) {
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: "PAID",
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          razorpaySignature: razorpay_signature,
          orderStatus: "CONFIRMED",
        },
        { new: true }
      ).populate("products.product");

      res.json({
        success: true,
        message: "Payment verified successfully",
        order,
      });
    } else {
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: "FAILED",
          orderStatus: "CANCELLED",
        },
        { new: true }
      );

      res.status(400).json({
        success: false,
        message: "Payment verification failed",
        order,
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      message: "Payment verification error",
      error: error.message,
    });
  }
};
export const getUserOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("user", "name email")
    .populate("products.product")
    .sort({ createdAt: -1 });

  res.json(orders);
};
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("products.product")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};
export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("products.product")
    .populate("user", "name email");

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // users can only see their own orders
  if (
    order.user._id.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  res.json(order);
};

export const updateOrderStatus = async (req, res) => {
  const { status, trackingNumber, estimatedDeliveryDate } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (status) order.orderStatus = status;
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (estimatedDeliveryDate !== undefined) order.estimatedDeliveryDate = estimatedDeliveryDate;

  await order.save();

  res.json({ success: true, order });
};
