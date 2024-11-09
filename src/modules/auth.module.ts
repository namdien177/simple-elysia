import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import env from "../env";
import { users } from "../schema";
import db from "../db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const authModule = new Elysia({
    name: "auth-module",
})
    .use(
        jwt({
            secret: env.AUTH_SECRET,
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
            detail: {
                tags: ["Auth"],
            },
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
            detail: {
                tags: ["Auth"],
            },
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
            detail: {
                tags: ["Auth"],
            },
        },
    );

export default authModule;
