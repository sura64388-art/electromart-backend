import mongoose from "mongoose";
import User from "./models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

async function checkAdminStatus() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const adminEmail = "muthur237@gmail.com";
        const user = await User.findOne({ email: adminEmail });

        if (user) {
            console.log("--- Admin User Info ---");
            console.log("Email:", user.email);
            console.log("Role:", user.role);
            console.log("Name:", user.name);
            console.log("------------------------");
        } else {
            console.log("Admin user NOT FOUND in database.");
            console.log("You may need to run the seeding route: POST /api/auth/user/admin");
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error:", err);
    }
}

checkAdminStatus();
