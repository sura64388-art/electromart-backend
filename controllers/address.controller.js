import User from "../models/user.model.js";
export const saveAddress=async(req,res)=>{
    try{
        const{
            fullName=req.user.name,
            phone=req.user.phone,
            street,
            city,
            state,
            pincode,
            country="India",
            landmark="",
            isDefault=false
        }=req.body;
        if(!street || !city || !state || !pincode){
            return res.status(400).json({
                success:false,
                message:"Street,city,state,and pincode are required"
            });
        }
        const user=await User.findById(req.user._id);
        if(!user){
            return res.status(404).json({
                success:false,
                message:"User not found"
            });
        }
        const newAddress={
            fullName,
            phone,
            street,
            city,
            state,
            pincode,
            country,
            landmark,
            isDefault
        };
        if(isDefault){
            user.addresses=user.addresses.map(addr=>({
                ...addr,
                isDefault:false
            }));
        }
        user.addresses.push(newAddress);
        if(user.addresses.length===1){
            user.addresses[0].isDefault=true;
        }
        await user.save();
        res.status(201).json({
            success:true,
            message:"Address saved successfully",
            address:user.addresses[user.addresses.length-1],
            addresses:user.addresses
        });
    } catch (error) {
        console.log("Error in saving address:",error);
        res.status(500).json({
            success:false,
            message:"failed to save address",
            error:error.message
        });
    };
}
export const getUserAddresses=async(req,res)=>{
    try{
        const user=await User.findById(req.user._id);
        if(!user){
            return res.status(404).json({
                success:false,
                message:"user not found",
            });
        }
        res.json({
            success:true,
            addresses:user.addresses||[],
        });
    }catch(error){
        console.log("Error in getting addresses:",error);
        res.status(500).json({
            success:false,
            message:"failed to get addresses",
            error:error.message
        });
    }
};
export const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const updates = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const addressIndex = user.addresses.findIndex(
      addr => addr._id.toString() === addressId
    );

    if (addressIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }
    if (updates.isDefault === true) {
      user.addresses = user.addresses.map(addr => ({
        ...addr,
        isDefault: false
      }));
    }
    user.addresses[addressIndex] = {
      ...user.addresses[addressIndex].toObject(),
      ...updates,
    };

    await user.save();
        res.json({
      success: true,
      message: "Address updated successfully",
      address: user.addresses[addressIndex],
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update address",
      error: error.message,
    });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const address = user.addresses.find(
      addr => addr._id.toString() === addressId
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    if (user.addresses.length === 1) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the only address. Add a new address first.",
      });
    }

    user.addresses = user.addresses.filter(
      addr => addr._id.toString() !== addressId
    );

    if (address.isDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.json({
      success: true,
      message: "Address deleted successfully",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
      error: error.message,
    });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const address = user.addresses.find(
      addr => addr._id.toString() === addressId
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    user.addresses = user.addresses.map(addr => ({
      ...addr,
      isDefault: addr._id.toString() === addressId
    }));

    await user.save();

    res.json({
      success: true,
      message: "Default address updated successfully",
      addresses: user.addresses,
    });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set default address",
      error: error.message,
    });
  }
};
