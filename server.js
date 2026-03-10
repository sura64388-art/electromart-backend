import dotenv from "dotenv";
dotenv.config();

import express from "express";
import authRoute from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import couponRoutes from "./routes/coupon.route.js";
import paymentRoutes from "./routes/payment.route.js";
import orderRoutes from "./routes/order.routes.js";
import analyticsRoutes from "./routes/analytics.route.js";
import contactRoutes from "./routes/contact.route.js";
import addressRoutes from "./routes/address.route.js";
import userRoutes from "./routes/user.route.js";
import chatbotRoute from "./routes/chatbot.route.js";

import { connectDb } from "./lib/db.js";

import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";

import cors from "cors";

const app = express();

// Trust proxy is required for cross-domain cookies on platforms like Render/Vercel
app.set("trust proxy", 1);

// Middleware
const allowedOrigins = [
    "https://electrical-frontend-kcad.vercel.app",
    "https://electricial-frontend-kcad.vercel.app",
    "https://electrical-frontend-hop2.vercel.app",
    "https://electromart-frontend-mu.vercel.app",
    "http://localhost:5173",
    "http://localhost:5180",
    "http://localhost:5181",
    "http://localhost:5182",
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
            callback(null, true);
        } else {
            console.warn("CORS blocked origin:", origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
    fileUpload({
        limits: { fileSize: 50 * 1024 * 1024 },
        useTempFiles: true,
    })
);

app.use(cookieParser());

// Routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/chat", chatbotRoute);

// Root Route
app.get("/", (req, res) => {
    res.send("Electrical Backend API is running 🚀");
});

// Start Server
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDb();
});
