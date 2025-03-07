"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./database/db");
const UserModel_1 = __importDefault(require("./models/UserModel"));
const svix_1 = require("svix");
dotenv_1.default.config();
(0, db_1.ConnectedDB)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Basic route
app.get("/", (req, res) => {
    res.send("Server is running successfully!");
});
// Webhook to handle Clerk user.created event
app.post("/clerk-webhook", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
        console.log("okok");
        if (!WEBHOOK_SECRET) {
            throw new Error("Please add CLERK_WEBHOOK_SECRET to .env file");
        }
        // Get the headers
        const svix_id = req.headers["svix-id"];
        const svix_timestamp = req.headers["svix-timestamp"];
        const svix_signature = req.headers["svix-signature"];
        // If there are no headers, error out
        if (!svix_id || !svix_timestamp || !svix_signature) {
            return res.status(400).json({ error: "Missing svix headers" });
        }
        // Create a new Webhook instance with your secret
        const wh = new svix_1.Webhook(WEBHOOK_SECRET);
        // Verify the webhook payload
        const payload = req.body;
        const body = JSON.stringify(payload);
        wh.verify(body, {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        });
        const { type, data } = payload;
        if (type !== "user.created") {
            return res.status(400).json({ message: "Invalid event type" });
        }
        const { id, email_addresses, phone_numbers, first_name, last_name } = data;
        const email = (email_addresses === null || email_addresses === void 0 ? void 0 : email_addresses.length) ? email_addresses[0].email_address : null;
        const phone = (phone_numbers === null || phone_numbers === void 0 ? void 0 : phone_numbers.length) ? phone_numbers[0].phone_number : null;
        let authMethod = null;
        let authValue = null;
        if (phone_numbers === null || phone_numbers === void 0 ? void 0 : phone_numbers.length) {
            authMethod = "phone";
            authValue = phone_numbers[0].phone_number;
        }
        else if (email_addresses === null || email_addresses === void 0 ? void 0 : email_addresses.length) {
            authMethod = "email";
            authValue = email_addresses[0].email_address;
        }
        else {
            return res.status(400).json({ message: "No valid authentication method found" });
        }
        // Check if the user already exists
        if (authMethod && authValue) {
            const existingUser = yield UserModel_1.default.findOne({ [authMethod]: authValue });
            if (existingUser) {
                return res.status(200).json({ message: "User already exists" });
            }
        }
        // Create a new user entry
        const newUser = new UserModel_1.default({
            clerkId: id,
            name: `${first_name || ""} ${last_name || ""}`.trim(),
            phone: phone || "",
            email: email || "",
            password: "", // Assuming password is managed by Clerk
        });
        yield newUser.save();
        res.status(201).json({ message: "User created successfully", user: newUser });
    }
    catch (error) {
        console.error("Webhook error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}));
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
