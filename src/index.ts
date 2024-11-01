import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import env from "./env";
import bcrypt from "bcrypt";
import db from "./db";

import { eq } from "drizzle-orm";
import bearer from "@elysiajs/bearer";
import { users } from "./schema";
import { logger } from "@bogeychan/elysia-logger";
import cors from "@elysiajs/cors";

const app = new Elysia()
    .use(cors({
        origin: true
    }))
    .use(
        jwt({
            secret: env.AUTH_SECRET,
        }),
    )
    .use(bearer())
    .use(swagger())
    .use(
        logger({
            timestamp: true,
        }),
    )
    .post(
        "/sign-in",
        async ({ body, jwt, error }) => {
            const { email, password } = body;

            // Fetch the user from the database
            const user = await db.query.users.findFirst({
                where: eq(users.email, email),
            });

            if (!user) {
                return error(401, "Unauthorized");
            }

            // Compare the hashed password
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return error(401, "Unauthorized");
            }

            // Generate a JWT token
            const access_token = await jwt.sign({
                sub: user.id.toString(),
                email: user.email,
            });

            return { access_token };
        },
        {
            type: "application/json",
            body: t.Object({
                email: t.String({ format: "email" }),
                password: t.String(),
            }),
            summary: "Sign In",
            description: "Endpoint for user sign-in",
        },
    )
    .post(
        "/sign-up",
        async ({ body, error }) => {
            const { username, email, password } = body;

            // Check if the user already exists
            const existingUser = await db.query.users.findFirst({
                where: eq(users.email, email),
            });

            if (existingUser) {
                return error(400, "User already exists");
            }

            // Hash the password
            const passwordHash = await bcrypt.hash(password, 10);

            // Insert the new user into the database
            try {
                const user = await db
                    .insert(users)
                    .values({
                        username,
                        email,
                        password: passwordHash,
                    })
                    .returning();

                if (!user) {
                    return error(500, "Internal Server Error");
                }

                return { message: "User registered successfully" };
            } catch (e) {
                // Handle errors (e.g., duplicate username/email)
                console.error(e);
                return error(500, "Internal Server Error");
            }
        },
        {
            body: t.Object({
                username: t.String(),
                password: t.String(),
                email: t.String({ format: "email" }),
            }),
            summary: "Sign Up",
            description: "Endpoint for user registration",
        },
    )
    .post(
        "/forgot-password",
        ({ body }) => {
            // Empty implementation
            return { message: "Forgot-password endpoint" };
        },
        {
            body: t.Object({
                email: t.String({ format: "email" }),
            }),
            response: t.Object({
                message: t.String(),
            }),
            summary: "Forgot Password",
            description: "Endpoint for password recovery",
        },
    )
    .get(
        "/me",
        async ({ jwt, bearer, error }) => {
            // decode the JWT token
            if (!bearer) {
                return error(401, "Unauthorized");
            }
            const decoded = await jwt.verify(bearer);
            if (!decoded || !decoded.email) {
                return error(401, "Unauthorized");
            }

            // Fetch the user from the database
            const user = await db.query.users.findFirst({
                where: eq(users.id, Number(decoded.sub)),
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
            summary: "Get User Profile",
            description: "Returns the authenticated user's profile",
        },
    )
    .post(
        "/me/update",
        async ({ jwt, body, bearer, error }) => {
            // decode the JWT token
            if (!bearer) {
                return error(401, "Unauthorized");
            }
            const decoded = await jwt.verify(bearer);
            if (!decoded || !decoded.email) {
                return error(401, "Unauthorized");
            }

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
                    .where(eq(users.id, Number(decoded.sub)));
                return { message: "Profile updated successfully" };
            } catch (e) {
                // Handle errors (e.g., duplicate username/email)
                return error(500, "Internal Server Error");
            }
        },
        {
            onRequest: ["jwt"],
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
        },
    )
    .listen(3000, () => {
        console.log("Server started on port 3000");
        console.log("Swagger UI available at http://localhost:3000/swagger");
    });
