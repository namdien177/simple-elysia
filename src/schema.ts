import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    avatar: blob("avatar").$type<string>(),
    // You can add more fields as needed
});

export type User = typeof users.$inferSelect;
