import mongoose from "mongoose";
import User from "./models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: "rahul@gmail.com" });
        if (user) {
            console.log("Email:", user.email);
            console.log("Has Password:", !!user.password);
            console.log("Role:", user.role);
            console.log("Name:", user.name);
            console.log("ID:", user._id);
            // Check if comparePassword exists
            console.log("comparePassword exists:", typeof user.comparePassword === 'function');
        } else {
            console.log("USER_NOT_FOUND");
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
checkUser();
