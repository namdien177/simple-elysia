import { Elysia, t } from "elysia";
import assert from "node:assert";
import db from "../db";
import { and, eq } from "drizzle-orm";
import { todoBuckets } from "../schema";
import { authMacro } from "./auth.macro";

export const bucketMacro = new Elysia({
    name: "bucket-macro",
})
    .use(authMacro)
    .guard({
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
    })
    .resolve({ as: "scoped" }, async ({ params, User, error }) => {
        assert(User?.id !== null && User?.id !== undefined, "User not found");
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
    });
