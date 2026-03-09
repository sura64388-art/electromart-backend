import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export const getChatResponse = async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        // Convert the history to Groq format (messages array)
        const messages = [
            {
                role: "system",
                content: "You are a helpful customer support assistant for Sree Saravana Electricals. Use the following brand info: Eveready, Schneider, Great White, V-Guard, AO Smith, Havells, Legrand, Finolex. You help users with electrical hardware, lights, fans, pumps, etc."
            }
        ];

        // Add history if available
        if (history && Array.isArray(history)) {
            history.forEach(item => {
                messages.push({
                    role: item.role === "user" ? "user" : "assistant",
                    content: item.parts[0].text // Handling the Gemini-style history provided previously
                });
            });
        }

        messages.push({
            role: "user",
            content: message
        });

        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
        });

        const text = chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";

        res.status(200).json({ text });
    } catch (error) {
        console.error("Error in Groq Chat:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};
