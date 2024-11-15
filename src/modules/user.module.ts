import { Elysia, t } from "elysia";
import { authMacro } from "../pre-handle/auth.macro";
import db from "../db";
import { eq } from "drizzle-orm";
import { users } from "../schema";
import bcrypt from "bcryptjs";
import assert from "node:assert";

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
                return {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    // Return avatar as a Base64 string if it exists
                    avatar: user.avatar ?? undefined,
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
    .post(
        "/me/update",
        async ({ User, body, error }) => {
            assert(User.id !== null);
            // Extract form data
            const { username, email, password, avatar: rawAvatar } = body;

            let avatar: Buffer | undefined;
            if (rawAvatar) {
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
                    type: "image/*",
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
