import Product from "../models/product.model.js";
import mongoose from "mongoose";
export const getCartProducts = async (req, res) => {
	try {
		console.log("Getting cart products for user:", req.user.email);
		const cartItemsRaw = req.user.cartItems || [];

		// Map safely handling both old (ID string) and new ({product: ID}) formats
		const productIds = cartItemsRaw.map(item => {
			if (typeof item === 'string' || item instanceof mongoose.Types.ObjectId) return item;
			return item.product;
		}).filter(id => id != null);

		const products = await Product.find({ _id: { $in: productIds } });

		// add quantity for each product
		const cartItems = products.map((product) => {
			const item = cartItemsRaw.find((cartItem) => {
				const pid = (typeof cartItem === 'string' || cartItem instanceof mongoose.Types.ObjectId)
					? cartItem.toString()
					: cartItem.product?.toString();
				return pid === product._id.toString();
			});
			const quantity = (item && typeof item === 'object' && item.quantity) ? item.quantity : 1;
			return { ...product.toJSON(), quantity };
		});

		res.json(cartItems);
	} catch (error) {
		console.error("Error in getCartProducts controller:", error);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const addToCart = async (req, res) => {
	try {
		const { productId } = req.body;
		const user = req.user;
		console.log(`Adding product ${productId} to cart for ${user.email}`);

		const existingItem = user.cartItems.find((item) => {
			const pid = (typeof item === 'string' || item instanceof mongoose.Types.ObjectId)
				? item.toString()
				: item.product?.toString();
			return pid === productId;
		});

		if (existingItem) {
			if (typeof existingItem === 'object' && existingItem.product) {
				existingItem.quantity += 1;
			} else {
				// If it was just an ID string, we replace it with the object format
				user.cartItems = user.cartItems.filter(item => {
					const pid = (typeof item === 'string' || item instanceof mongoose.Types.ObjectId) ? item.toString() : item.product?.toString();
					return pid !== productId;
				});
				user.cartItems.push({ product: productId, quantity: 2 });
			}
		} else {
			user.cartItems.push({ product: productId, quantity: 1 });
		}

		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		console.error("Error in addToCart controller:", error);
		res.status(500).json({
			message: "Server error during cart update",
			error: error.message,
			details: error.errors ? Object.keys(error.errors).map(key => error.errors[key].message) : []
		});
	}
};

export const removeAllFromCart = async (req, res) => {
	try {
		const { productId } = req.body;
		const user = req.user;
		if (!productId) {
			user.cartItems = [];
		} else {
			user.cartItems = user.cartItems.filter((item) => {
				const pid = (typeof item === 'string' || item instanceof mongoose.Types.ObjectId)
					? item.toString()
					: item.product?.toString();
				return pid !== productId;
			});
		}
		await user.save();
		res.json(user.cartItems);
	} catch (error) {
		console.error("Error in removeAllFromCart controller:", error);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateQuantity = async (req, res) => {
	try {
		const { id: productId } = req.params;
		const { quantity } = req.body;
		const user = req.user;
		const existingItem = user.cartItems.find((item) => {
			const pid = (typeof item === 'string' || item instanceof mongoose.Types.ObjectId)
				? item.toString()
				: item.product?.toString();
			return pid === productId;
		});

		if (existingItem) {
			if (quantity === 0) {
				user.cartItems = user.cartItems.filter((item) => {
					const pid = (typeof item === 'string' || item instanceof mongoose.Types.ObjectId)
						? item.toString()
						: item.product?.toString();
					return pid !== productId;
				});
				await user.save();
				return res.json(user.cartItems);
			}

			if (typeof existingItem === 'object' && existingItem.product) {
				existingItem.quantity = quantity;
			} else {
				// Safety migration
				user.cartItems = user.cartItems.filter(item => {
					const pid = (typeof item === 'string' || item instanceof mongoose.Types.ObjectId) ? item.toString() : item.product?.toString();
					return pid !== productId;
				});
				user.cartItems.push({ product: productId, quantity });
			}
			await user.save();
			res.json(user.cartItems);
		} else {
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.error("Error in updateQuantity controller:", error);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
