// import mongoose from "mongoose";

// const UserSchema = new mongoose.Schema({
//     clerkId: String,
//     email: String,
//     firstName: String,
//     lastName: String,
//     password: String,
// });

// export default mongoose.model("Usermodels", UserSchema);


import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    clerkId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String }, // Clerk handles authentication
}, { timestamps: true });

const UserModel = mongoose.model("User", UserSchema);

export default UserModel;
