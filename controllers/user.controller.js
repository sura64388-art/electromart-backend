import User from "../models/user.model.js";

export const getAllCustomers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password");
        res.json(users);
    } catch (error) {
        console.log("Error in getAllCustomers controller", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const deleteCustomer = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role === "admin") {
            return res.status(403).json({ message: "Cannot delete an admin user" });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Customer deleted successfully" });
    } catch (error) {
        console.log("Error in deleteCustomer controller", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
