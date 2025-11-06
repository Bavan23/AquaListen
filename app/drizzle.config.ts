// Drizzle configuration - Currently using MongoDB with Mongoose instead of PostgreSQL
// This configuration is kept for reference but not actively used

import { defineConfig } from "drizzle-kit";

// Note: PROJECT NOW USES MONGODB WITH MONGOOSE
// The DATABASE_URL should point to MongoDB connection string
// Example: mongodb+srv://username:password@cluster.mongodb.net/database

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set - using MongoDB with Mongoose instead of Drizzle");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts", 
  dialect: "postgresql", // Note: This was for PostgreSQL, now using MongoDB
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
