import mongoose from "mongoose";
import User from "./models/user.model.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

async function debugLogin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const email = "rahul@gmail.com";
        const password = "password"; // I'll assume a common password or just check if user exists

        const user = await User.findOne({ email });
        if (!user) {
            console.log("User not found: " + email);
        } else {
            console.log("User found: " + user.email);
            console.log("Password hash in DB: " + user.password);

            try {
                const isMatch = await user.comparePassword("password123"); // test with something
                console.log("Password comparison works, isMatch: " + isMatch);
            } catch (err) {
                console.error("Error in comparePassword: ", err);
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Connection error: ", err);
    }
}

debugLogin();
