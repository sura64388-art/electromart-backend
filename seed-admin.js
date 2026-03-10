import mongoose from "mongoose";
import User from "./models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

async function seedAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const adminEmail = (process.env.ADMIN_EMAIL || "muthur237@gmail.com").toLowerCase();

        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log("Admin already exists. Updating its role to admin...");
            existingAdmin.role = "admin";
            await existingAdmin.save();
            console.log("Success.");
        } else {
            console.log("Creating new admin user...");
            const user = await User.create({
                name: process.env.ADMIN_NAME || "Muthuraj",
                email: adminEmail,
                password: process.env.ADMIN_PASS || "Muthuraj01@gmail.com",
                role: "admin"
            });
            console.log("Admin created successfully:", user.email);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error seeding admin:", err);
    }
}

seedAdmin();
