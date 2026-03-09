import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: false,
		},
		price: {
			type: Number,
			min: 0,
			required: true,
		},
		image: {
			type: String,
			required: [true, "Image is required"],
		},
		category: {
			type: String,
			required: true,
		},
		subCategory: {
			type: String,
			required: true,
		},
		brand: {
			type: String,
			required: true,
		},
		color: {
			type: String,
			required: false,
		},
		stock: {
			type: Number,
			min: 0,
			required: true,
		},
		offer: {
			type: Boolean,
			default: false,
		},
		discountPercentage: {
			type: Number,
			default: 0,
		},
		isFeatured: {
			type: Boolean,
			default: false,
		},
		reviews: [
			{
				user: {
					type: mongoose.Schema.Types.ObjectId,
					ref: "User",
					required: true,
				},
				name: {
					type: String,
					required: true,
				},
				rating: {
					type: Number,
					required: true,
				},
				comment: {
					type: String,
					required: true,
				},
			},
			{ timestamps: true },
		],
		rating: {
			type: Number,
			required: true,
			default: 0,
		},
		numReviews: {
			type: Number,
			required: true,
			default: 0,
		},
	},
	{ timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
