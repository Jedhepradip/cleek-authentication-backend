import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    clerkId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String
    },
    password: {
        type: String
    }, // Clerk handles authentication
}, { timestamps: true });

const UserModel = mongoose.model("User", UserSchema);

export default UserModel;
