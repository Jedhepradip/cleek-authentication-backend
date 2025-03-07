import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ConnectedDB } from "./database/db";
import UserModel from "./models/UserModel";
import { WebhookEvent } from "@clerk/clerk-sdk-node";
import { Webhook } from "svix";

dotenv.config();
ConnectedDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json()); // Keep this for other routes

// Middleware for parsing raw body in the webhook route
app.use("/clerk-webhook", express.raw({ type: "application/json" }));

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get("/", (req, res) => {
    res.send("Server is running successfully!");
});

// Webhook to handle Clerk user.created event
// app.post("/clerk-webhook", async (req: Request, res: Response): Promise<any> => {
//     try {
//         const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
//         console.log("okok");

//         if (!WEBHOOK_SECRET) {
//             throw new Error("Please add CLERK_WEBHOOK_SECRET to .env file");
//         }

//         // Get the headers
//         const svix_id = req.headers["svix-id"] as string | undefined;
//         const svix_timestamp = req.headers["svix-timestamp"] as string | undefined;
//         const svix_signature = req.headers["svix-signature"] as string | undefined;

//         // If there are no headers, error out
//         if (!svix_id || !svix_timestamp || !svix_signature) {
//             return res.status(400).json({ error: "Missing svix headers" });
//         }

//         // Create a new Webhook instance with your secret
//         const wh = new Webhook(WEBHOOK_SECRET);

//         // Verify the webhook payload
//         const payload = req.body;
//         const body = JSON.stringify(payload);

//         wh.verify(body, {
//             "svix-id": svix_id,
//             "svix-timestamp": svix_timestamp,
//             "svix-signature": svix_signature,
//         });

//         const { type, data } = payload;

//         if (type !== "user.created") {
//             return res.status(400).json({ message: "Invalid event type" });
//         }

//         const { id, email_addresses, phone_numbers, first_name, last_name } = data;
//         const email = email_addresses?.length ? email_addresses[0].email_address : null;
//         const phone = phone_numbers?.length ? phone_numbers[0].phone_number : null;

//         let authMethod: "phone" | "email" | null = null;
//         let authValue: string | null = null;

//         if (phone_numbers?.length) {
//             authMethod = "phone";
//             authValue = phone_numbers[0].phone_number;
//         } else if (email_addresses?.length) {
//             authMethod = "email";
//             authValue = email_addresses[0].email_address;
//         } else {
//             return res.status(400).json({ message: "No valid authentication method found" });
//         }

//         // Check if the user already exists
//         if (authMethod && authValue) {
//             const existingUser = await UserModel.findOne({ [authMethod]: authValue });
//             if (existingUser) {
//                 return res.status(200).json({ message: "User already exists" });
//             }
//         }

//         // Create a new user entry
//         const newUser = new UserModel({
//             clerkId: id,
//             name: `${first_name || ""} ${last_name || ""}`.trim(),
//             phone: phone || "",
//             email: email || "",
//             password: "", // Assuming password is managed by Clerk
//         });

//         await newUser.save();

//         res.status(201).json({ message: "User created successfully", user: newUser });
//     } catch (error: any) {
//         console.error("Webhook error:", error);
//         res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// });


app.post("/clerk-webhook", async (req: Request, res: Response): Promise<any> => {
    try {
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

        if (!WEBHOOK_SECRET) {
            throw new Error("Please add CLERK_WEBHOOK_SECRET to .env file");
        }

        // Get headers
        const svixHeaders = {
            "svix-id": req.headers["svix-id"] as string,
            "svix-timestamp": req.headers["svix-timestamp"] as string,
            "svix-signature": req.headers["svix-signature"] as string,
        };

        // Ensure all headers exist
        if (!svixHeaders["svix-id"] || !svixHeaders["svix-timestamp"] || !svixHeaders["svix-signature"]) {
            return res.status(400).json({ error: "Missing Svix headers" });
        }

        // Webhook verification
        const wh = new Webhook(WEBHOOK_SECRET);
        const payloadString = req.body.toString(); // Convert buffer to string
        const evt = wh.verify(payloadString, svixHeaders) as WebhookEvent;

        // Handle user.created event
        if (evt.type !== "user.created") {
            return res.status(400).json({ message: "Invalid event type" });
        }

        // Extract user details
        const { id: clerkId, email_addresses, phone_numbers, first_name, last_name } = evt.data;
        const email = email_addresses?.[0]?.email_address || "";
        const phone = phone_numbers?.[0]?.phone_number || "";

        // Check if user already exists
        const existingUser = await UserModel.findOne({ clerkId });
        if (existingUser) {
            return res.status(200).json({ message: "User already exists", user: existingUser });
        }

        // Create new user in the database
        const newUser = new UserModel({
            clerkId,
            name: `${first_name || ""} ${last_name || ""}`.trim(),
            phone,
            email,
            password: "", // Password is handled by Clerk
        });

        await newUser.save();

        return res.status(201).json({ message: "User created successfully", user: newUser });
    } catch (error: any) {
        console.error("Webhook error:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});