import Product from "../models/product.model.js";
import cloudinary from "../lib/cloudinary.js";
import { redis } from "../lib/redis.js";
export const getAllProducts = async (req, res) => {
	try {
		const products = await Product.find({});
		res.json({ products });
	} catch (error) {
		console.log("Error in getAllProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
export const getFeaturedProducts = async (req, res) => {
	try {
		let featuredProducts = await redis.get("featured_products");
		if (featuredProducts) {
			return res.json(JSON.parse(featuredProducts));
		}

		// if not in redis, fetch from mongodb
		// .lean() is gonna return a plain javascript object instead of a mongodb document
		// which is good for performance
		featuredProducts = await Product.find({ isFeatured: true }).lean();

		if (!featuredProducts) {
			return res.status(404).json({ message: "No featured products found" });
		}

		// store in redis for future quick access

		await redis.set("featured_products", JSON.stringify(featuredProducts));

		res.json(featuredProducts);
	} catch (error) {
		console.log("Error in getFeaturedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
export const createProduct = async (req, res) => {
	try {
		const { name, description, price, image, category, subCategory, brand, color, stock, offer, discountPercentage } = req.body;

		if (!image) {
			return res.status(400).json({ message: "Image is required" });
		}

		let imageUrl = image;

		// Only attempt Cloudinary upload if credentials are provided and not placeholders
		if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
			try {
				const cloudinaryResponse = await cloudinary.uploader.upload(image, {
					folder: "products",
				});
				imageUrl = cloudinaryResponse.secure_url;
			} catch (err) {
				console.error("Cloudinary upload failed, falling back to base64:", err.message);
				// Continue with base64 if Cloudinary fails
			}
		} else {
			console.log("Cloudinary not configured or using placeholders, saving image as base64.");
		}

		const product = await Product.create({
			name,
			description,
			price,
			category,
			subCategory,
			brand,
			stock,
			offer,
			discountPercentage,
			color,
			image: imageUrl,
		});

		await redis.del("featured_products");

		res.status(201).json(product);
	} catch (error) {
		console.log("Error in createProduct controller", error);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const deleteProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		if (product.image) {
			const publicId = product.image.split("/").pop().split(".")[0];
			try {
				await cloudinary.uploader.destroy(`products/${publicId}`);
				console.log("deleted image from cloduinary");
			} catch (error) {
				console.log("error deleting image from cloduinary", error);
			}
		}
		await Product.findByIdAndDelete(req.params.id);

		res.json({ message: "Product deleted successfully" });
	} catch (error) {
		console.log("Error in deleteProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
export const getRecommendedProducts = async (req, res) => {
	try {
		const products = await Product.aggregate([
			{
				$sample: { size: 4 },
			},
			{
				$project: {
					_id: 1,
					name: 1,
					description: 1,
					image: 1,
					price: 1,
				},
			},
		]);

		res.json(products);
	} catch (error) {
		console.log("Error in getRecommendedProducts controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
export const getProductsByCategory = async (req, res) => {
	const { category } = req.params;
	try {
		const products = await Product.find({ category });
		res.json({ products });
	} catch (error) {
		console.log("Error in getProductsByCategory controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
export const toggleFeaturedProduct = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);
		if (product) {
			product.isFeatured = !product.isFeatured;
			const updatedProduct = await product.save();
			await updateFeaturedProductsCache();
			res.json(updatedProduct);
		} else {
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.log("Error in toggleFeaturedProduct controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
async function updateFeaturedProductsCache() {
	try {
		// The lean() method  is used to return plain JavaScript objects instead of full Mongoose documents. This can significantly improve performance

		const featuredProducts = await Product.find({ isFeatured: true }).lean();
		await redis.set("featured_products", JSON.stringify(featuredProducts));
	} catch (error) {
		console.log("error in update cache function");
	}
};
export const getProductById = async (req, res) => {
	try {
		const product = await Product.findById(req.params.id);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		res.json(product);
	} catch (error) {
		console.log("Error in getProductById", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const createProductReview = async (req, res) => {
	const { rating, comment } = req.body;

	try {
		const product = await Product.findById(req.params.id);

		if (product) {
			const alreadyReviewed = product.reviews.find(
				(r) => r.user.toString() === req.user._id.toString()
			);

			if (alreadyReviewed) {
				return res.status(400).json({ message: "Product already reviewed" });
			}

			const review = {
				name: req.user.name,
				rating: Number(rating),
				comment,
				user: req.user._id,
			};

			product.reviews.push(review);

			product.numReviews = product.reviews.length;

			product.rating =
				product.reviews.reduce((acc, item) => item.rating + acc, 0) /
				product.reviews.length;

			await product.save();
			res.status(201).json({ message: "Review added" });
		} else {
			res.status(404).json({ message: "Product not found" });
		}
	} catch (error) {
		console.log("Error in createProductReview", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const updateProduct = async (req, res) => {
	try {
		const { name, description, price, image, category, subCategory, brand, color, stock, offer, discountPercentage } = req.body;
		const productId = req.params.id;

		const product = await Product.findById(productId);

		if (!product) {
			return res.status(404).json({ message: "Product not found" });
		}

		let imageUrl = product.image;

		// If a new image is provided (not a URL, likely base64)
		if (image && !image.startsWith("http")) {
			// Delete old image from Cloudinary if it exists
			if (product.image && product.image.includes("cloudinary")) {
				const publicId = product.image.split("/").pop().split(".")[0];
				try {
					await cloudinary.uploader.destroy(`products/${publicId}`);
				} catch (error) {
					console.log("Error deleting old image from cloudinary", error);
				}
			}

			// Upload new image
			if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
				try {
					const cloudinaryResponse = await cloudinary.uploader.upload(image, {
						folder: "products",
					});
					imageUrl = cloudinaryResponse.secure_url;
				} catch (err) {
					console.error("Cloudinary upload failed, falling back to base64:", err.message);
					imageUrl = image;
				}
			} else {
				imageUrl = image;
			}
		}

		const updatedProduct = await Product.findByIdAndUpdate(
			productId,
			{
				name,
				description,
				price,
				category,
				subCategory,
				brand,
				stock,
				offer,
				discountPercentage,
				color,
				image: imageUrl,
			},
			{ new: true }
		);

		await redis.del("featured_products");

		res.json(updatedProduct);
	} catch (error) {
		console.log("Error in updateProduct controller", error);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
