import bcrypt from "bcryptjs";

try {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync("password123", salt);
    console.log("Hash:", hash);
    const match = bcrypt.compareSync("password123", hash);
    console.log("Match:", match);
} catch (err) {
    console.error("Bcrypt error:", err);
}
