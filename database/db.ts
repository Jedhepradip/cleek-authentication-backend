import mongoose from "mongoose"

export const ConnectedDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL || "")
    // console.log(`MongoDB connected successfully on host : ${conn.connection.host}`)
    console.log(`MongoDB connected successfully\n`)
  } catch (error) {
    console.error(`Error: ${error}`)
    process.exit(1)
  }
}