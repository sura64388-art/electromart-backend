import mongoose from "mongoose";
export const connectDb= async()=>{
    try{
       const conn=await mongoose.connect(process.env.MONGO_URI);
       console.log(`mongoDb connected on ${conn.connection.host}`);
    }catch(err){
       console.log("error connecting to mongoDB",err.message);
       process.exit(1); 
    }
}