import { numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const optimizations = pgTable("optimizations", {
	id: serial("id").primaryKey(),
	fileName: text("file_name").notNull(),
	fileType: text("file_type").notNull(),
	quality: numeric("quality").notNull(),
	width: numeric("width"),
	userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
	sessionId: text("session_id").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
