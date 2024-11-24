import { Elysia, t } from "elysia";
import { authMacro } from "../pre-handle/auth.macro";
import db from "../db";
import { eq } from "drizzle-orm";
import { users } from "../schema";
import bcrypt from "bcryptjs";
import assert from "node:assert";
import { fileTypeFromBuffer } from "file-type";

const userModule = new Elysia({
    name: "user-module",
})
    .use(authMacro)
    .get(
        "/me",
        async ({ User, error }) => {
            assert(User.id !== null);

            // Fetch the user from the database
            const user = await db.query.users.findFirst({
                where: eq(users.id, User.id),
            });

            if (user) {
                let blobAvatar = user.avatar;
                let avatar: string | undefined;

                if (blobAvatar) {
                    // made the user to query the avatar separately
                    avatar = `/me/avatar`;
                }

                return {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    // Return avatar as a Base64 string if it exists
                    avatar,
                };
            }

            return error(404, "Not Found");
        },
        {
            isProtected: true,
            summary: "Get User Profile",
            description: "Returns the authenticated user's profile",
            detail: {
                tags: ["User"],
            },
        },
    )
    .get(
        "/me/avatar",
        // Get the authenticated user's avatar only
        async ({ User, error }) => {
            assert(User.id !== null);

            // Fetch the user from the database
            const user = await db.query.users.findFirst({
                where: eq(users.id, User.id),
                columns: {
                    avatar: true,
                },
            });

            if (user) {
                let blobAvatar = user.avatar;
                let avatar: string | undefined;

                if (blobAvatar) {
                    avatar = blobAvatar.toString("base64");
                    const fileType = await fileTypeFromBuffer(blobAvatar);
                    if (!fileType) {
                        return error(500, "Internal Server Error");
                    }
                    // return image as base64 string
                    let prefix = `data:${fileType.mime};base64,`;
                    return prefix + avatar;
                }
            }

            return error(404, "Not Found");
        },
        {
            isProtected: true,
            summary: "Get User Avatar",
            description:
                "Returns the authenticated user's avatar as a Base64 string",
            detail: {
                tags: ["User"],
            },
        },
    )
    .post(
        "/me/update",
        async ({ User, body, error }) => {
            assert(User.id !== null);
            // Extract form data
            const { username, email, password, avatar: rawAvatar } = body;

            let avatar: Buffer | undefined;
            if (rawAvatar) {
                // since rawAvatar cannot be verified to be an image with t.File yet
                // https://github.com/elysiajs/elysia/issues/74
                // we need to manually check the content type here to be image/*
                if (!rawAvatar.type.startsWith("image/")) {
                    return error(400, "Invalid avatar file");
                }

                // Read the uploaded avatar file
                avatar = Buffer.from(await rawAvatar.arrayBuffer());
            }

            // Build the update object
            const updateData: any = {};
            if (username) updateData.username = username;

            if (email) updateData.email = email;

            if (password) {
                // Hash the password before storing
                updateData.password = await bcrypt.hash(password, 10);
            }
            if (avatar) updateData.avatar = avatar;

            // Update the user in the database
            try {
                await db
                    .update(users)
                    .set(updateData)
                    .where(eq(users.id, User.id));
                return { message: "Profile updated successfully" };
            } catch (e) {
                // Handle errors (e.g., duplicate username/email)
                return error(500, "Internal Server Error");
            }
        },
        {
            isProtected: true,
            body: t.Object({
                username: t.Optional(t.String()),
                email: t.Optional(t.String({ format: "email" })),
                password: t.Optional(t.String()),
                avatar: t.File({
                    maxSize: "5m",
                }),
            }),
            summary: "Update User Profile",
            description: "Updates the authenticated user's profile",
            detail: {
                tags: ["User"],
            },
        },
    );

export default userModule;
