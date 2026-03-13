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

// One-time seed endpoint: adds default reviews to products without reviews
export const seedDefaultReviews = async (req, res) => {
	try {
		const reviewPool = [
			{ name: "Rahul Kumar", rating: 4, comment: "Very good product! Quality is excellent and delivery was on time. Highly recommended." },
			{ name: "Priya Sharma", rating: 5, comment: "Amazing quality! Best purchase I've made. The build quality is premium and works perfectly." },
			{ name: "Suresh Babu", rating: 3, comment: "Good product for the price. Does the job well. Could be slightly better in finish quality." },
			{ name: "Anita Devi", rating: 5, comment: "Excellent product! Using it for 2 months now, no complaints at all. Very durable and reliable." },
			{ name: "Vijay Reddy", rating: 4, comment: "Nice product, value for money. Installation was easy and it's working great so far." },
			{ name: "Meena Patel", rating: 4, comment: "Good quality electrical product. Trusted brand, no issues. Would buy again for sure." },
			{ name: "Karthik S", rating: 5, comment: "Top notch quality! Exactly as described. Perfect fit for my requirements. Five stars!" },
			{ name: "Deepa Nair", rating: 3, comment: "Decent product. Works fine but packaging could be better. Overall satisfactory purchase." },
			{ name: "Arun Prakash", rating: 4, comment: "Reliable product from a good brand. Using it daily without any problems. Good purchase." },
			{ name: "Lakshmi R", rating: 5, comment: "Outstanding! Premium feel and excellent performance. Worth every rupee spent on it." },
			{ name: "Manoj Kumar", rating: 4, comment: "Very satisfied with this purchase. Good build quality and works as expected." },
			{ name: "Sanjay Verma", rating: 3, comment: "Ok product. Nothing extraordinary but gets the work done. Average quality for the price." },
			{ name: "Kavitha M", rating: 5, comment: "Superb quality! My electrician also praised the product. Will recommend to everyone." },
			{ name: "Ganesh R", rating: 4, comment: "Good product. Fast delivery and proper packaging. Happy with the purchase." },
			{ name: "Divya S", rating: 5, comment: "Best in class! Have been using this brand for years. Never disappoints. Highly recommended." },
			{ name: "Ramesh T", rating: 4, comment: "Solid product with good finish. Easy installation process. Working perfectly since day one." },
			{ name: "Sunita Kaur", rating: 3, comment: "Average product. Usable but I expected slightly better quality for this price point." },
			{ name: "Naveen J", rating: 5, comment: "Fantastic quality and design! Looks premium after installation. Very happy customer." },
			{ name: "Pooja Gupta", rating: 4, comment: "Really good product! Safe and durable. My family is very satisfied with this purchase." },
			{ name: "Harish M", rating: 4, comment: "Worth buying. The quality matches the price. Smooth operation and long lasting product." },
		];

		const products = await Product.find({});
		let updatedCount = 0;

		for (const product of products) {
			// Skip products that already have reviews
			if (product.reviews && product.reviews.length > 0) continue;

			// Pick 3-5 random reviews
			const numReviews = 3 + Math.floor(Math.random() * 3);
			const shuffled = [...reviewPool].sort(() => Math.random() - 0.5);
			const selectedReviews = shuffled.slice(0, numReviews);

			const reviews = selectedReviews.map((r) => ({
				user: product._id, // use product ID as dummy user ref
				name: r.name,
				rating: r.rating,
				comment: r.comment,
			}));

			const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

			product.reviews = reviews;
			product.numReviews = reviews.length;
			product.rating = Math.round(avgRating * 10) / 10;

			await product.save();
			updatedCount++;
		}

		res.json({ message: `Seeded reviews for ${updatedCount} products`, total: products.length });
	} catch (error) {
		console.error("Error in seedDefaultReviews", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
