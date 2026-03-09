import mongoose from "mongoose";
import User from "./models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: "rahul@gmail.com" });
        if (user) {
            console.log("USER_DATA:" + JSON.stringify(user));
        } else {
            console.log("USER_NOT_FOUND");
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
checkUser();
