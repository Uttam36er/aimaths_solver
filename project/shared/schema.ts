import { pgTable, text, serial, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const problems = pgTable("problems", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  imageUrl: text("image_url"),
  solution: json("solution").$type<{
    text: string;
    error?: string;
  }>(),
});

export const insertProblemSchema = createInsertSchema(problems).pick({
  question: true,
  imageUrl: true,
});

export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problems.$inferSelect;
