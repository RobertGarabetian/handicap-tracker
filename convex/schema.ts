import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rounds: defineTable({
    userId: v.string(),               // required for auth
    date: v.string(),                 // ISO
    course: v.string(),
    rating: v.number(),               // Course Rating
    slope: v.number(),                // 55–155
    gross: v.number(),
    differential: v.number(),
    ocrRaw: v.optional(v.string()),   // optional for debugging
    imageUrl: v.optional(v.string()), // optional (Convex file storage)
  }).index("by_user_date", ["userId", "date"])
});
