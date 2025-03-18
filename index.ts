import express, { Request, Response } from "express";
import { Webhook } from 'svix';
import cors from "cors"
import * as dotenv from 'dotenv';
import UserModel from "./models/UserModel";
import { ConnectedDB } from "./database/db";
import protectedRoute from "./Middleware/authMiddleware";
import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
import { AuthenticatedRequest } from "./Middleware/authMiddleware";

const app = express();
dotenv.config();
app.use(cors());
ConnectedDB()

const PORT = 3000;

app.use(ClerkExpressWithAuth());

app.get("/protected-route", protectedRoute, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.json({ message: "You have access!", userId: req?.auth?.userId });
    console.log();
});

app.use((req, res, next) => {
    if (req.path === '/clerk/webhook') {
        next();
    } else {
        express.json()(req, res, next);
    }
});

// Add these interfaces at the top of the file
interface ClerkWebhookPayload {
    type: string;
    data: {
        id: string;
        email_addresses: Array<{ email_address: string }>;
        phone_numbers: Array<{ phone_number: string }>;
        first_name: string | null;
        last_name: string | null;
    };
}

app.use(express.urlencoded({ extended: true }))

app.get("/", (_, res) => {
    res.send("hello word")
})
// Webhook to handle Clerk user.created event
app.post('/clerk/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response): Promise<void> => {
    try {
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

        if (!WEBHOOK_SECRET) {
            throw new Error('Please add CLERK_WEBHOOK_SECRET to .env file');
        }

        // Get the headers
        const svix_id = req.headers["svix-id"] as string;
        const svix_timestamp = req.headers["svix-timestamp"] as string;
        const svix_signature = req.headers["svix-signature"] as string;

        // If there are no headers, error out
        if (!svix_id || !svix_timestamp || !svix_signature) {
            res.status(400).json({ error: 'Missing svix headers' });
            return;
        }

        // Create a new Webhook instance with your secret
        const wh = new Webhook(WEBHOOK_SECRET);

        // Verify the webhook payload with raw body
        const payload = wh.verify(req.body.toString(), {
            "svix-id": svix_id,
            "svix-timestamp": svix_timestamp,
            "svix-signature": svix_signature,
        }) as ClerkWebhookPayload;

        const { type, data } = payload;

        if (type !== "user.created") {
            res.status(400).json({ message: "Invalid event type" });
            return;
        }

        const { id, email_addresses, phone_numbers, first_name, last_name } = data;
        const email = email_addresses?.length ? email_addresses[0].email_address : null;
        const phone = phone_numbers?.length ? phone_numbers[0].phone_number : null;

        let altName = email?.split("@")[0];

        // Create a new user entry
        const newUser = new UserModel({
            clerkId: id,
            name: ` ${first_name || altName} ${last_name || ""}.trim()`,
            phoneNumber: phone || "",
            email: email || "",
            password: "", // Assuming password is managed by Clerk
        });

        await newUser.save();

        res.status(201).json({ message: "User created successfully", user: newUser });
    } catch (error) {
        console.error("Webhook error:", error);
        res.status(500).json({ message: "Internal server error", error: error });
    }
});

app.listen(3000)