import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/product.model.js";

dotenv.config();

// Default reviews pool - realistic Indian customer reviews for electrical products
const reviewPool = [
	{ name: "Rahul Kumar", rating: 4, comment: "Very good product! Quality is excellent and delivery was on time. Highly recommended for home use." },
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

// Generate a pseudo-random ObjectId from a seed string (deterministic)
function generateObjectId(seed) {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = ((hash << 5) - hash) + seed.charCodeAt(i);
		hash |= 0;
	}
	const hex = Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
	const suffix = seed.length.toString(16).padStart(4, '0').slice(0, 4);
	const extra = (hash >>> 0).toString(16).padStart(12, '0').slice(0, 12);
	return new mongoose.Types.ObjectId(hex + suffix + extra);
}

async function seedReviews() {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		console.log("✅ Connected to MongoDB");

		const products = await Product.find({});
		console.log(`📦 Found ${products.length} products`);

		let updatedCount = 0;

		for (const product of products) {
			// Skip if product already has real reviews
			if (product.reviews && product.reviews.length > 0) {
				console.log(`⏭️  Skipping "${product.name}" — already has ${product.reviews.length} review(s)`);
				continue;
			}

			// Pick 3-5 random reviews for each product
			const numReviews = 3 + Math.floor(Math.random() * 3); // 3 to 5
			const shuffled = [...reviewPool].sort(() => Math.random() - 0.5);
			const selectedReviews = shuffled.slice(0, numReviews);

			const reviews = selectedReviews.map((r) => ({
				user: generateObjectId(r.name + product._id.toString()),
				name: r.name,
				rating: r.rating,
				comment: r.comment,
				createdAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000), // random date within last 90 days
			}));

			const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

			product.reviews = reviews;
			product.numReviews = reviews.length;
			product.rating = Math.round(avgRating * 10) / 10; // round to 1 decimal

			await product.save();
			updatedCount++;
			console.log(`✅ Added ${reviews.length} reviews to "${product.name}" — Rating: ${product.rating}`);
		}

		console.log(`\n🎉 Done! Updated ${updatedCount} products with default reviews.`);
		process.exit(0);
	} catch (error) {
		console.error("❌ Error seeding reviews:", error);
		process.exit(1);
	}
}

seedReviews();
