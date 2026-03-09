import Order from "../models/order.model.js";
import razorpay from "../lib/razorpay.js";

export const refundOrder = async (req, res) => {
	try {
		const order = await Order.findById(req.params.id);

		if (!order) {
			return res.status(404).json({ message: "Order not found" });
		}

		if (order.paymentStatus !== "PAID") {
			return res.status(400).json({
				message: "Only PAID orders can be refunded",
			});
		}
		if (!order.razorpayPaymentId) {
			return res.status(400).json({
				message: "Missing Razorpay payment ID",
			});
		}

		if (order.refundStatus === "REFUNDED") {
			return res.status(400).json({
				message: "Order already refunded",
			});
		}
		const refund = await razorpay.payments.refund(
			order.razorpayPaymentId,
			{
				amount: Math.round(order.totalAmount * 100),
			}
		);
		order.paymentStatus = "REFUNDED";
		order.refundStatus = "REFUNDED";
		await order.save();
		res.json({
			success: true,
			message: "Refund processed successfully",
			refundId: refund.id,
		});
	} catch (error) {
		console.error("Refund Error:", error);
		res.status(500).json({
			message: "Refund failed",
			error: error.message,
		});
	}
};

