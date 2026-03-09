import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
});

const Product = mongoose.model('Product', productSchema);

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- Database Check ---');

        const counts = await Product.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        console.log('Product counts by category:');
        counts.forEach(c => {
            console.log(`- ${c._id}: ${c.count} products`);
        });

        const allProducts = await Product.find({}).limit(5);
        console.log('\nSample products:');
        allProducts.forEach(p => {
            console.log(`- Name: "${p.name}", Category: "${p.category}"`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkProducts();
