import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const users = sqliteTable("users", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    avatar: blob("avatar").$type<string>(),
});

export const userRelations = relations(users, ({ many }) => ({
    todos: many(todoBuckets),
}));

export const todoBuckets = sqliteTable("todo_buckets", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull(),
    title: text("title").notNull(),
    public: integer("public", { mode: "boolean" }).notNull(),
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
