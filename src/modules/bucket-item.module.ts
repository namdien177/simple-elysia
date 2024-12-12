import { Elysia, t } from "elysia";
import { authMacro } from "../pre-handle/auth.macro";
import assert from "node:assert";
import db from "../db";
import { and, count, eq, like, SQLWrapper } from "drizzle-orm";
import { todoBuckets, todoItems } from "../schema";

const bucketItemModule = new Elysia({
    name: "todo-item-module",
    prefix: "buckets/:bucketId/items",
})
    .use(authMacro)
    .guard({
        isProtected: true,
    })
    // CRUD of todo-items
    .group(
        "",
        {
            params: t.Object(
                {
                    bucketId: t.Number({
                        description: "Bucket ID",
                    }),
                },
                {
                    additionalProperties: true,
                },
            ),
        },
        (app) =>
            app
                .resolve({ as: "scoped" }, async ({ params, User, error }) => {
                    assert(User?.id !== null && User?.id !== undefined);
                    const userId = User.id;
                    const bucketId = params.bucketId;

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

                    return {
                        Bucket: bucket,
                    };
                })
                .get(
                    "",
                    async ({ Bucket, query }) => {
                        const { page, limit, query: searchQuery, done } = query;

                        type KeyofTodoItems =
                            keyof typeof todoItems.$inferSelect;

                        const conditionsFn = (
                            tb: Pick<typeof todoItems, KeyofTodoItems>,
                        ) => {
                            const filters: Array<SQLWrapper> = [];
                            filters.push(eq(tb.bucketId, Bucket.id));
                            if (searchQuery) {
                                filters.push(
                                    like(tb.content, `%${searchQuery}%`),
                                );
                            }
                            if (done !== undefined) {
                                filters.push(eq(tb.done, done === 1));
                            }
                            return and(...filters);
                        };

                        // Fetch todo items
                        const items = await db.query.todoItems.findMany({
                            where: conditionsFn,
                            limit,
                            offset: (page - 1) * limit,
                        });
                        const [total] = await db
                            .select({ count: count() })
                            .from(todoItems)
                            .where(conditionsFn(todoItems));

                        return {
                            data: items,
                            total: total?.count ?? 0,
                        };
                    },
                    {
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
                                t.Numeric({
                                    description:
                                        "Done status of the todo item, 0 for false, 1 for true",
                                }),
                            ),
                        }),
                        detail: {
                            tags: ["Bucket Items"],
                            description:
                                "Get all items in a bucket (pagination supported)",
                        },
                    },
                )
                .post(
                    "",
                    async ({ Bucket, body, error }) => {
                        const { content, deadline, parentId } = body;

                        // ensure the newly created todo only 1 level deep
                        if (parentId) {
                            const parent = await db.query.todoItems.findFirst({
                                where: and(
                                    eq(todoItems.bucketId, Bucket.id),
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
                                bucketId: Bucket.id,
                                content,
                                parentId,
                                deadline: deadline
                                    ? deadline.toISOString()
                                    : null,
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
                            deadline: t.Optional(
                                t.Date({
                                    description:
                                        "Deadline of the todo item, Date in ISO format",
                                }),
                            ),
                        }),
                        detail: {
                            tags: ["Bucket Items"],
                            description: "Create a new item in a bucket",
                        },
                    },
                )
                .group(
                    ":itemId",
                    {
                        params: t.Object({
                            bucketId: t.Number({
                                description: "Bucket ID",
                            }),
                            itemId: t.Number({
                                description: "Item ID",
                            }),
                        }),
                    },
                    (app) =>
                        app
                            .patch(
                                "",
                                async ({ Bucket, params, body, error }) => {
                                    const itemId = params.itemId;
                                    const { content, done } = body;

                                    // ensure the item exists
                                    const item =
                                        await db.query.todoItems.findFirst({
                                            where: and(
                                                eq(
                                                    todoItems.bucketId,
                                                    Bucket.id,
                                                ),
                                                eq(todoItems.id, itemId),
                                            ),
                                        });
                                    if (!item) {
                                        return error(404, "Item not found");
                                    }

                                    // Update the todo item
                                    try {
                                        await db
                                            .update(todoItems)
                                            .set({
                                                content,
                                                done,
                                            })
                                            .where(eq(todoItems.id, itemId))
                                            .execute();
                                    } catch (e) {
                                        console.log(e);
                                    }

                                    return {
                                        data: {
                                            id: itemId,
                                        },
                                    };
                                },
                                {
                                    body: t.Object({
                                        content: t.Optional(
                                            t.String({
                                                minLength: 2,
                                                maxLength: 1000,
                                                description:
                                                    "Content of the todo item",
                                            }),
                                        ),
                                        done: t.Optional(
                                            t.Boolean({
                                                description:
                                                    "Done status of the todo item",
                                            }),
                                        ),
                                    }),
                                    detail: {
                                        tags: ["Bucket Items"],
                                        description:
                                            "Update an item in a bucket",
                                    },
                                },
                            )
                            .delete(
                                "",
                                async ({ Bucket, params, error }) => {
                                    const itemId = params.itemId;

                                    // ensure the item exists
                                    const item =
                                        await db.query.todoItems.findFirst({
                                            where: and(
                                                eq(
                                                    todoItems.bucketId,
                                                    Bucket.id,
                                                ),
                                                eq(todoItems.id, itemId),
                                            ),
                                        });
                                    if (!item) {
                                        return error(404, "Item not found");
                                    }

                                    // Delete the todo item
                                    try {
                                        await db
                                            .delete(todoItems)
                                            .where(eq(todoItems.id, itemId))
                                            .execute();
                                    } catch (e) {
                                        console.log(e);
                                    }

                                    return {
                                        data: {
                                            id: itemId,
                                        },
                                    };
                                },
                                {
                                    detail: {
                                        tags: ["Bucket Items"],
                                        description:
                                            "Delete an item in a bucket",
                                    },
                                },
                            ),
                ),
    );

export default bucketItemModule;
