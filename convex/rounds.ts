import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({ 
  args: { userId: v.optional(v.string()) }, 
  handler: async (ctx, args) => {
    if (args.userId) {
      return await ctx.db.query("rounds")
        .withIndex("by_user_date", q => q.eq("userId", args.userId))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("rounds").order("desc").collect();
  }
});

export const add = mutation({ 
  args: {
    userId: v.optional(v.string()), 
    date: v.string(), 
    course: v.string(), 
    rating: v.number(), 
    slope: v.number(), 
    gross: v.number(), 
    differential: v.number(), 
    ocrRaw: v.optional(v.string()), 
    imageUrl: v.optional(v.string())
  }, 
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("rounds", args);
    return id;
  }
});

export const clearForUser = mutation({ 
  args: { userId: v.string() }, 
  handler: async (ctx, { userId }) => {
    const items = await ctx.db.query("rounds")
      .withIndex("by_user_date", q => q.eq("userId", userId))
      .collect();
    await Promise.all(items.map(i => ctx.db.delete(i._id)));
  }
});

export const addDemoData = mutation({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const demoRounds = [
      {
        userId: args.userId,
        date: "2024-01-15",
        course: "Pebble Beach Golf Links",
        rating: 72.8,
        slope: 145,
        gross: 85,
        differential: 9.5,
      },
      {
        userId: args.userId,
        date: "2024-01-22",
        course: "Augusta National",
        rating: 78.1,
        slope: 137,
        gross: 92,
        differential: 11.4,
      },
      {
        userId: args.userId,
        date: "2024-01-29",
        course: "St. Andrews Old Course",
        rating: 72.9,
        slope: 133,
        gross: 88,
        differential: 12.8,
      },
      {
        userId: args.userId,
        date: "2024-02-05",
        course: "TPC Sawgrass",
        rating: 76.4,
        slope: 155,
        gross: 89,
        differential: 9.2,
      },
      {
        userId: args.userId,
        date: "2024-02-12",
        course: "Whistling Straits",
        rating: 77.2,
        slope: 152,
        gross: 91,
        differential: 10.3,
      },
    ];

    const ids = [];
    for (const round of demoRounds) {
      const id = await ctx.db.insert("rounds", round);
      ids.push(id);
    }
    return ids;
  }
});
