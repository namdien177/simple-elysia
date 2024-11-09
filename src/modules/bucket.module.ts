import { Elysia, t } from "elysia";
import { authMacro } from "../pre-handle/auth.macro";
import assert from "node:assert";
import db from "../db";
import { and, eq, like, or, SQLWrapper } from "drizzle-orm";
import { todoBuckets } from "../schema";

const bucketModule = new Elysia({
    name: "bucket-module",
    prefix: "buckets",
})
    .use(authMacro)
    .guard({
        isProtected: true,
    })
    // CRUD operations for todo buckets
    .get(
        "",
        async ({ User, query }) => {
            assert(User?.id !== null && User.id !== undefined);
            const userId = User.id;
            const { page, limit, query: searchQuery, visibility } = query;
            // Fetch todo buckets
            const buckets = await db.query.todoBuckets.findMany({
                where: (tb) => {
                    const filters: Array<SQLWrapper> = [];
                    filters.push(eq(tb.userId, userId));
                    if (searchQuery) {
                        filters.push(like(tb.title, `%${searchQuery}%`));
                    }
                    if (visibility) {
                        filters.push(eq(tb.public, visibility === "public"));
                    }
                    return and(...filters);
                },
                limit,
                offset: (page - 1) * limit,
            });

            return {
                data: buckets,
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
                visibility: t.Optional(
                    t.Enum({
                        PUBLIC: "public",
                        PRIVATE: "private",
                    }),
                ),
            }),
            detail: {
                tags: ["Bucket"],
                description: "Get Todo Buckets of the authenticated user",
            },
        },
    )
    .post(
        "",
        async ({ User, body, error }) => {
            // assert
            assert(User?.id !== null && User.id !== undefined);
            const userId = User.id;
            const { title, public: visibility } = body;

            // check if the bucket already exists
            const existingBucket = await db.query.todoBuckets.findFirst({
                where: (tb) => and(eq(tb.userId, userId), eq(tb.title, title)),
            });

            // if the bucket already exists, return an error 400 with a message
            if (existingBucket) {
                return error(400, "Bucket already exists");
            }

            let inserted: typeof todoBuckets.$inferSelect | null = null;

            try {
                // create a new todo bucket
                const bucket: typeof todoBuckets.$inferInsert = {
                    userId,
                    title,
                    public: visibility,
                };
                const [returned] = await db
                    .insert(todoBuckets)
                    .values(bucket)
                    .returning();
                inserted = returned;
            } catch (e) {
                console.error(e);
            }

            if (!inserted) {
                return error(500, "Internal Server Error");
            }
            return {
                data: {
                    id: inserted.id,
                },
            };
        },
        {
            body: t.Object({
                title: t.String({
                    minLength: 1,
                    maxLength: 100,
                    description: "Bucket title. Must be unique",
                }),
                public: t.Boolean({
                    default: false,
                    description: "Public visibility",
                }),
            }),
            detail: {
                tags: ["Bucket"],
                description: "Create a new todo bucket. Title must be unique",
            },
        },
    )
    .get(
        ":bucketId",
        async ({ User, params, error }) => {
            assert(User?.id !== null && User.id !== undefined);
            const userId = User.id;
            const bucketId = params.bucketId;

            // Fetch the bucket
            const bucket = await db.query.todoBuckets.findFirst({
                where: (tb) =>
                    and(
                        eq(tb.id, bucketId),
                        or(
                            // If the bucket is public, return it
                            eq(tb.public, true),
                            // If the bucket is private, check if the user is the owner
                            and(eq(tb.userId, userId), eq(tb.public, false)),
                        ),
                    ),
            });

            if (!bucket) {
                return error(404, "Bucket not found");
            }

            return {
                data: bucket,
            };
        },
        {
            params: t.Object({
                bucketId: t.Number({
                    description: "Bucket id",
                    minimum: 1,
                }),
            }),
            detail: {
                tags: ["Bucket"],
                description:
                    "Get a todo bucket by id. If the bucket is private, the user must be the owner",
            },
        },
    )
    .patch(
        ":bucketId",
        async ({ User, params, body, error }) => {
            assert(User?.id !== null && User.id !== undefined);
            const userId = User.id;
            const bucketId = params.bucketId;
            const { title, public: visibility } = body;

            // Fetch the bucket
            const bucket = await db.query.todoBuckets.findFirst({
                where: (tb) =>
                    and(
                        eq(tb.id, bucketId),
                        or(
                            // If the bucket is public, return it
                            eq(tb.public, true),
                            // If the bucket is private, check if the user is the owner
                            and(eq(tb.userId, userId), eq(tb.public, false)),
                        ),
                    ),
            });

            if (!bucket) {
                return error(404, "Bucket not found");
            }

            // if the user is not the owner of the bucket, return an error 403
            if (bucket.userId !== userId) {
                return error(403, "Forbidden");
            }

            // Update the bucket
            await db
                .update(todoBuckets)
                .set({
                    title,
                    public: visibility,
                })
                .where(eq(todoBuckets.id, bucketId));

            return {
                data: {
                    id: bucketId,
                },
            };
        },
        {
            params: t.Object({
                bucketId: t.Number({
                    description: "Bucket id",
                    minimum: 1,
                }),
            }),
            body: t.Object({
                title: t.String({
                    minLength: 1,
                    maxLength: 100,
                    description: "Bucket title. Must be unique",
                }),
                public: t.Boolean({
                    default: false,
                    description: "Public visibility",
                }),
            }),
            detail: {
                tags: ["Bucket"],
                description: "Update a todo bucket by id",
            },
        },
    )
    .delete(
        ":bucketId",
        async ({ User, params, error }) => {
            assert(User?.id !== null && User.id !== undefined);
            const userId = User.id;
            const bucketId = params.bucketId;

            // Fetch the bucket
            const bucket = await db.query.todoBuckets.findFirst({
                where: (tb) =>
                    and(
                        eq(tb.id, bucketId),
                        or(
                            // If the bucket is public, return it
                            eq(tb.public, true),
                            // If the bucket is private, check if the user is the owner
                            and(eq(tb.userId, userId), eq(tb.public, false)),
                        ),
                    ),
            });

            if (!bucket) {
                return error(404, "Bucket not found");
            }

            // if the user is not the owner of the bucket, return an error 403
            if (bucket.userId !== userId) {
                return error(403, "Forbidden");
            }

            // Delete the bucket
            await db.delete(todoBuckets).where(eq(todoBuckets.id, bucketId));

            return {
                data: {
                    id: bucketId,
                },
            };
        },
        {
            params: t.Object({
                bucketId: t.Number({
                    description: "Bucket id",
                    minimum: 1,
                }),
            }),
            detail: {
                tags: ["Bucket"],
                description: "Delete a todo bucket by id",
            },
        },
    );

export default bucketModule;
