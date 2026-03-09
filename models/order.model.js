import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        size: String,
        color: String,
      },
    ],

    totalAmount: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    
    deliveryAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
      pincode: { type: String, required: true },
      landmark: { type: String },
      phone: { type: String, required: true },
      fullName: { type: String, required: true }
    },
    
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    
    paymentMethod: {
      type: String,
      enum: ["COD", "ONLINE"],
      default: "ONLINE"
    },

    orderStatus: {
      type: String,
      enum: [
        "PLACED",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "PLACED",
    },

    refundStatus: {
      type: String,
      enum: ["NONE", "REQUESTED", "REFUNDED"],
      default: "NONE",
    },

    razorpayOrderId: {
      type:String,
      sparse:true
    },
    razorpayPaymentId: String,
    razorpaySignature: String,

    discountApplied: { type: Number, default: "" },
    shippingMethod: {
      type: String,
      enum: ["STANDARD", "EXPRESS", "SAME_DAY"], 
      default: "STANDARD"
    },
    
    estimatedDeliveryDate: Date,
    trackingNumber: String,
    
    couponCode: String,
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
