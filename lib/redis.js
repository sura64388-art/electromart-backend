import dotenv from "dotenv";
dotenv.config();

// Simple in-memory Redis mock for development without a real Redis server
class MockRedis {
    constructor() {
        this.store = new Map();
        console.log("⚠️  Redis server not found. Using in-memory storage for development.");
    }

    async set(key, value, ...args) {
        this.store.set(key, value);
        return "OK";
    }

    async get(key) {
        return this.store.get(key) || null;
    }

    async del(key) {
        this.store.delete(key);
        return 1;
    }
}

// Export the mock instance
export const redis = new MockRedis();
