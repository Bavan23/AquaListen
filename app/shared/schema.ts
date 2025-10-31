import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Reef Sites Schema
export const reefSites = pgTable("reef_sites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  location: text("location").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  status: text("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
});

// Audio Predictions Schema  
export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").references(() => reefSites.id),
  filename: text("filename").notNull(),
  healthStatus: text("health_status").notNull(), // healthy, stressed, ambient
  confidence: real("confidence").notNull(),
  audioFeatures: text("audio_features"), // JSON string
  processingTime: real("processing_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Alerts Schema
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  siteId: varchar("site_id").references(() => reefSites.id),
  predictionId: varchar("prediction_id").references(() => predictions.id),
  alertType: text("alert_type").notNull(), // stress_detected, low_confidence, etc.
  message: text("message").notNull(),
  severity: text("severity").notNull().default("medium"), // low, medium, high, critical
  isRead: integer("is_read").default(0), // 0 = unread, 1 = read
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSiteSchema = createInsertSchema(reefSites).pick({
  name: true,
  location: true,
  latitude: true,
  longitude: true,
});

export const insertPredictionSchema = createInsertSchema(predictions).pick({
  siteId: true,
  filename: true,
  healthStatus: true,
  confidence: true,
  audioFeatures: true,
  processingTime: true,
});

export const insertAlertSchema = createInsertSchema(alerts).pick({
  siteId: true,
  predictionId: true,
  alertType: true,
  message: true,
  severity: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ReefSite = typeof reefSites.$inferSelect;
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
