import { Elysia, t } from "elysia";
import { authMacro } from "../pre-handle/auth.macro";
import assert from "node:assert";
import db from "../db";
import { and, eq, like, or, SQLWrapper } from "drizzle-orm";
import { todoBuckets, todoItems } from "../schema";

const todoItemModule = new Elysia({
    name: "todo-item-module",
})
    .use(authMacro)
    // CRUD of todo items
    .get(
        "buckets/:bucketId/items",
        async ({ User, params, query, error }) => {
            // assert
            assert(User?.id !== null && User.id !== undefined);
            const userId = User.id;
            const bucketId = params.bucketId;
            const { page, limit, query: searchQuery, done } = query;

            // ensure user can view the bucket
            const bucket = await db.query.todoBuckets.findFirst({
                where: and(
                    eq(todoBuckets.id, bucketId),
                    or(
                        eq(todoBuckets.userId, userId),
                        eq(todoBuckets.public, true),
                    ),
                ),
            });
            if (!bucket) {
                return error(404, "Bucket not found");
            }

            // Fetch todo items
            const items = await db.query.todoItems.findMany({
                where: (ti) => {
                    const filters: Array<SQLWrapper> = [];
                    filters.push(eq(ti.bucketId, bucketId));
                    if (searchQuery) {
                        filters.push(like(ti.content, `%${searchQuery}%`));
                    }
                    if (done !== undefined) {
                        filters.push(eq(ti.done, done));
                    }
                    return and(...filters);
                },
                limit,
                offset: (page - 1) * limit,
            });

            return {
                data: items,
            };
        },
        {
            isAuthenticated: true,
            params: t.Object({
                bucketId: t.Number({
                    description: "Bucket ID",
                }),
            }),
            query: t.Object({
                page: t.Number({
                    default: 1,
                    minimum: 1,
                    description: "Page number",
                }),
                limit: t.Number({
                    default: 10,
                    minimum: 1,
                    maximum: 100,
                    description: "Items per page",
                }),
                query: t.Optional(
                    t.String({
                        minLength: 2,
                        maxLength: 100,
                        description: "Search query",
                    }),
                ),
                done: t.Optional(
                    t.Boolean({
                        description: "Filter by done status",
                    }),
                ),
            }),
            detail: {
                tags: ["Bucket Items"],
                description: "Get all items in a bucket (pagination supported)",
            },
        },
    )
    .post(
        "buckets/:bucketId/items",
        async ({ User, params, body, error }) => {
            // assert
            assert(User?.id !== null && User.id !== undefined);
            const userId = User.id;
            const bucketId = params.bucketId;
            const { content, parentId } = body;

            // ensure user is the owner of the bucket
            const bucket = await db.query.todoBuckets.findFirst({
                where: and(
                    eq(todoBuckets.id, bucketId),
                    eq(todoBuckets.userId, userId),
                ),
            });
            if (!bucket) {
                return error(404, "Bucket not found");
            }

            // ensure the newly created todo only 1 level deep
            if (parentId) {
                const parent = await db.query.todoItems.findFirst({
                    where: and(
                        eq(todoItems.bucketId, bucketId),
                        eq(todoItems.id, parentId),
                    ),
                });
                if (!parent) {
                    return error(404, "Parent item not found");
                }
                // ensure the parent item is not a child
                if (parent.parentId !== null) {
                    return error(
                        400,
                        "Only 1 level deep todo items are supported",
                    );
                }
            }

            // Create the todo item
            let createdItemId: number | null = null;

            try {
                const data: typeof todoItems.$inferInsert = {
                    bucketId,
                    content,
                    parentId,
                    done: false,
                };
                const [created] = await db
                    .insert(todoItems)
                    .values(data)
                    .returning();
                createdItemId = created.id;
            } catch (e) {
                console.log(e);
            }

            if (createdItemId === null) {
                return error(500, "Internal Server Error");
            }

            return {
                data: {
                    id: createdItemId,
                },
            };
        },
        {
            isAuthenticated: true,
            params: t.Object({
                bucketId: t.Number({
                    description: "Bucket ID",
                }),
            }),
            body: t.Object({
                content: t.String({
                    minLength: 2,
                    maxLength: 1000,
                    description: "Content of the todo item",
                }),
                parentId: t.Optional(
                    t.Number({
                        description: "Parent item ID",
                    }),
                ),
            }),
            detail: {
                tags: ["Bucket Items"],
                description: "Create a new item in a bucket",
            },
        },
    );

export default todoItemModule;
