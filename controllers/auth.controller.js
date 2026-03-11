import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import sendEmail from "../lib/sendEmail.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
dotenv.config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const generateTokens = (userId) => {
	const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
		expiresIn: "15m",
	});
	const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
		expiresIn: "7d",
	});
	return { accessToken, refreshToken };
};
const storeRefreshToken = async (userId, refreshToken) => {
	await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60);
};
const setCookies = (res, accessToken, refreshToken) => {
	const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

	res.cookie("accessToken", accessToken, {
		httpOnly: true, // prevent XSS
		secure: isProduction, // only send over HTTPS in production
		sameSite: isProduction ? "none" : "lax", // allow cross-site cookies in prod, lax in dev
		maxAge: 15 * 60 * 1000, // 15 minutes
	});
	res.cookie("refreshToken", refreshToken, {
		httpOnly: true, // prevent XSS
		secure: isProduction, // only send over HTTPS in production
		sameSite: isProduction ? "none" : "lax", // allow cross-site cookies in prod, lax in dev
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});
};
export const signup = async (req, res) => {
	const { email, password, name } = req.body;
	try {
		const userExists = await User.findOne({ email });

		if (userExists) {
			return res.status(400).json({ message: "User already exists" });
		}
		const user = await User.create({ name, email, password });
		const { accessToken, refreshToken } = generateTokens(user._id);
		await storeRefreshToken(user._id, refreshToken);
		setCookies(res, accessToken, refreshToken);


		res.status(201).json({
			_id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
			avatar: user.avatar ?? "avatar1.png",
			mobile: user.mobile ?? "",
			address: user.address ?? null,
		});
	} catch (error) {
		console.log("Error in signup controller", error.message);
		res.status(500).json({ message: error.message });
	}
}
export const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		// 1. Basic validation
		if (!email || !password) {
			return res.status(400).json({ message: "Email and password are required" });
		}

		// 2. Find user (trim and lowercase email for consistency)
		const user = await User.findOne({ email: email.trim().toLowerCase() });

		// 3. Validate user and password
		console.log(`Attempting login for: ${email}`);
		if (user) {
			const isMatch = await user.comparePassword(password);
			console.log(`User found. Password match: ${isMatch}`);
			if (isMatch) {
				// Generate tokens
				const { accessToken, refreshToken } = generateTokens(user._id);

				// Store refresh token in Redis (Mock in dev)
				await storeRefreshToken(user._id, refreshToken);

				// Set cookies in response
				setCookies(res, accessToken, refreshToken);

				// Return user data (avoiding sensitive info)
				return res.json({
					_id: user._id,
					name: user.name,
					email: user.email,
					role: user.role,
					avatar: user.avatar ?? "avatar1.png",
					mobile: user.mobile ?? "",
					address: user.address ?? null,
				});
			}
		} else {
			console.log("User not found in DB");
		}

		// Log for server-side debugging
		console.warn(`Failed login attempt for email: ${email}`);
		return res.status(400).json({ message: "Invalid email or password" });
	} catch (error) {
		console.error("Error in login controller:", error.message);
		return res.status(500).json({ message: "Internal server error", error: error.message });
	}
};

export const googleLogin = async (req, res) => {
	try {
		const { credential } = req.body;
		if (!credential) {
			return res.status(400).json({ message: "Google credential is required" });
		}

		const ticket = await googleClient.verifyIdToken({
			idToken: credential,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const { name, email, picture, sub } = ticket.getPayload();

		let user = await User.findOne({ email });

		if (!user) {
			// Create new user if they don't exist
			user = await User.create({
				name,
				email,
				password: Math.random().toString(36).slice(-8) + sub.slice(-4), // Random password
				avatar: picture,
				googleId: sub,
			});
		} else if (!user.googleId) {
			// Link existing user to Google if not already linked
			user.googleId = sub;
			if (!user.avatar) user.avatar = picture;
			await user.save();
		}

		const { accessToken, refreshToken } = generateTokens(user._id);
		await storeRefreshToken(user._id, refreshToken);
		setCookies(res, accessToken, refreshToken);

		res.json({
			_id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
			avatar: user.avatar ?? "avatar1.png",
			mobile: user.mobile ?? "",
			address: user.address ?? null,
		});
	} catch (error) {
		console.error("Error in googleLogin controller:", error.message);
		res.status(500).json({ message: "Google Authentication failed", error: error.message });
	}
};
export const logout = async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken;
		if (refreshToken) {
			const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
			await redis.del(`refresh_token:${decoded.userId}`);
		}

		const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
		const cookieOptions = {
			httpOnly: true,
			secure: isProduction,
			sameSite: isProduction ? "none" : "lax",
		};

		res.clearCookie("accessToken", cookieOptions);
		res.clearCookie("refreshToken", cookieOptions);
		res.json({ message: "Logged out successfully" });
	} catch (error) {
		console.log("Error in logout controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
export const refreshToken = async (req, res) => {
	try {
		const refreshToken = req.cookies.refreshToken;

		if (!refreshToken) {
			return res.status(401).json({ message: "No refresh token provided" });
		}

		const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
		const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

		if (storedToken !== refreshToken) {
			return res.status(401).json({ message: "Invalid refresh token" });
		}

		const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });

		const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: isProduction ? "none" : "lax",
			maxAge: 15 * 60 * 1000,
		});

		// Also refresh the refreshToken expiration
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: isProduction ? "none" : "lax",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});

		res.json({ message: "Token refreshed successfully" });
	} catch (error) {
		console.log("Error in refreshToken controller", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
export const getProfile = async (req, res) => {
	try {
		res.json({
			_id: req.user._id,
			name: req.user.name,
			email: req.user.email,
			role: req.user.role,
			avatar: req.user.avatar ?? "avatar1.png",
			mobile: req.user.mobile ?? "",
			address: req.user.address ?? null,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
export const updateProfile = async (req, res) => {
	try {
		const { name, email, mobile, avatar } = req.body;

		const userId = req.user?._id || req.user?.id;
		if (!userId) return res.status(401).json({ message: "Unauthorized - No user found" });

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		let avatarUrl = avatar;

		// Handle Avatar Upload to Cloudinary if it's base64
		if (avatar && avatar.startsWith("data:image")) {
			// Delete old avatar from Cloudinary if it exists
			if (user.avatar && user.avatar.includes("cloudinary")) {
				const publicId = user.avatar.split("/").pop().split(".")[0];
				try {
					await cloudinary.uploader.destroy(`avatars/${publicId}`);
				} catch (error) {
					console.log("Error deleting old avatar from cloudinary", error);
				}
			}

			// Upload new avatar
			if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name') {
				try {
					const cloudinaryResponse = await cloudinary.uploader.upload(avatar, {
						folder: "avatars",
					});
					avatarUrl = cloudinaryResponse.secure_url;
				} catch (err) {
					console.error("Cloudinary upload failed, using original input:", err.message);
					avatarUrl = avatar;
				}
			}
		}

		user.name = name ?? user.name;
		user.email = email ?? user.email;
		user.mobile = mobile ?? user.mobile;
		user.avatar = avatarUrl ?? user.avatar;

		await user.save();

		return res.json({
			_id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
			avatar: user.avatar ?? "/avatar1.png",
			mobile: user.mobile ?? "",
			address: user.address ?? null,
		});
	} catch (err) {
		console.log("UPDATE ERROR:", err);
		return res.status(500).json({ message: err.message });
	}
};
export const updatePassword = async (req, res) => {
	try {
		const { currentPassword, newPassword, confirmPassword } = req.body;

		if (!currentPassword || !newPassword || !confirmPassword) {
			return res.status(400).json({ message: "All fields are required" });
		}
		if (newPassword.length < 6) {
			return res.status(400).json({ message: "Password must be at least 6 characters long" });
		}

		if (newPassword !== confirmPassword) {
			return res.status(400).json({ message: "New passwords do not match" });
		}

		const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ message: "User not found" });

		const isMatch = await user.comparePassword(currentPassword);
		if (!isMatch) {
			return res.status(400).json({ message: "Current password is incorrect" });
		}

		user.password = newPassword;
		await user.save();

		return res.json({ message: "Password updated successfully" });

	} catch (error) {
		console.log("Error updating password:", error.message);
		return res.status(500).json({ message: "Server error" });
	}
};
export const sendOTP = async (req, res) => {
	try {
		const { email } = req.body;

		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		console.log(otp);
		user.otp = otp;
		user.otpExpire = Date.now() + 10 * 60 * 1000;
		await user.save();

		await sendEmail(
			user.email,
			"Password Reset OTP",
			otp
		);

		res.json({ message: "OTP sent to email" });
	} catch (error) {
		console.error("Send OTP error", error);
		res.status(500).json({ message: "Server error" });
	}
};

export const resetPasswordWithOTP = async (req, res) => {
	try {
		const { email, otp, password } = req.body;
		if (!password || password.length < 6) {
			return res.status(400).json({ message: "password must be at least 6 character" });
		}
		const user = await User.findOne({
			email,
			otp,
			otpExpire: { $gt: Date.now() }
		});
		if (!user) {
			return res.status(400).json({ message: "Invalid or exprired OTP" });
		}
		user.password = password;
		user.otp = undefined;
		user.otpExpire = undefined;

		await user.save();

		res.json({ message: "Password reset successful" });
	} catch (error) {
		console.error("Reset password error", error);
		res.status(500).json({ message: "Server error" });
	}
};
export const updateAddress = async (req, res) => {
	try {
		const { fullName, phone, street, city, state, pincode } = req.body;

		const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ message: "User not found" });

		user.address = { fullName, phone, street, city, state, pincode };
		await user.save();

		res.json({
			_id: user._id,
			name: user.name,
			email: user.email,
			role: user.role,
			avatar: user.avatar,
			mobile: user.mobile,
			address: user.address,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
export const ADMIN = async (req, res) => {
	try {
		// Use environment variables or defaults to seed the admin
		const adminName = process.env.ADMIN_NAME || "Muthuraj";
		const adminEmail = (process.env.ADMIN_EMAIL || "muthur237@gmail.com").toLowerCase();
		const adminPassword = process.env.ADMIN_PASS || "Muthuraj01@gmail.com";

		const existingAdmin = await User.findOne({ email: adminEmail });
		if (existingAdmin) {
			return res.status(400).json({ message: "Admin already exists" });
		}

		const user = await User.create({
			name: adminName,
			email: adminEmail,
			password: adminPassword,
			role: "admin"
		});

		return res.status(201).json({
			message: "Admin created successfully",
			user: {
				_id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
			}
		});
	} catch (error) {
		console.error("Error seeding admin:", error.message);
		return res.status(500).json({ message: "Failed to create admin", error: error.message });
	}
};
