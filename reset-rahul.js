import mongoose from "mongoose";
import User from "./models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

async function resetRahulPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: "rahul@gmail.com" });
        if (user) {
            user.password = "password123";
            await user.save();
            console.log("Password for rahul@gmail.com reset to password123");
        } else {
            console.log("User not found: rahul@gmail.com");
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
resetRahulPassword();
