import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";
import { DateString } from "./helpers";

export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    avatar: blob("avatar").$type<Buffer>(),
    createdAt: text("created_at")
        .notNull()
        .default(sql`(current_timestamp)`)
        .$type<DateString>(),
    updatedAt: text("updated_at").$type<DateString | null>(),
});

export const userRelations = relations(users, ({ many }) => ({
    todos: many(todoBuckets),
}));

export const todoBuckets = sqliteTable("todo_buckets", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    title: text("title").notNull(),
    public: integer("public", { mode: "boolean" }).notNull(),
    createdAt: text("created_at")
        .notNull()
        .default(sql`(current_timestamp)`)
        .$type<DateString>(),
    updatedAt: text("updated_at").$type<DateString | null>(),
});

export const todoBucketRelations = relations(todoBuckets, ({ one, many }) => ({
    user: one(users, {
        fields: [todoBuckets.userId],
        references: [users.id],
    }),
    items: many(todoItems),
}));

export const todoItems = sqliteTable("todo_items", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bucketId: integer("bucket_id").notNull(),
    parentId: integer("parent_id").$type<number | null>(),
    content: text("content").notNull(),
    done: integer("done", { mode: "boolean" }).notNull(),
    createdAt: text("created_at")
        .notNull()
        .default(sql`(current_timestamp)`)
        .$type<DateString>(),
    deadline: text("deadline").$type<DateString | null>(),
    updatedAt: text("updated_at").$type<DateString | null>(),
});

export const todoItemRelations = relations(todoItems, ({ one, many }) => ({
    bucket: one(todoBuckets, {
        fields: [todoItems.bucketId],
        references: [todoBuckets.id],
    }),
    parent: one(todoItems, {
        fields: [todoItems.parentId],
        references: [todoItems.id],
        relationName: "nesting",
    }),
    children: many(todoItems, {
        relationName: "nesting",
    }),
    attachments: many(todoItemAttachments),
}));

export const todoItemAttachments = sqliteTable("todo_item_attachments", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    todoItemId: integer("todo_item_id").notNull(),
    fileName: text("file_name").notNull(),
    data: blob("data").$type<string>(),
    createdAt: text("created_at")
        .notNull()
        .default(sql`(current_timestamp)`)
        .$type<DateString>(),
    updatedAt: text("updated_at").$type<DateString | null>(),
});

export const todoItemAttachmentRelations = relations(
    todoItemAttachments,
    ({ one }) => ({
        item: one(todoItems, {
            fields: [todoItemAttachments.todoItemId],
            references: [todoItems.id],
        }),
    }),
);

export type User = typeof users.$inferSelect;
