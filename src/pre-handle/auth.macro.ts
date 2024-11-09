import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import env from "../env";
import bearer from "@elysiajs/bearer";

export const authMacro = new Elysia({
    name: "auth-macro",
})
    .use(
        jwt({
            secret: env.AUTH_SECRET,
        }),
    )
    .use(bearer())
    .derive({ as: "scoped" }, async ({ jwt, bearer }) => {
        let userId: number | null = null;
        if (!bearer) {
            return {
                User: {
                    id: null,
                },
            };
        }
        const decoded = await jwt.verify(bearer);
        if (decoded && decoded.sub) {
            userId = parseInt(decoded.sub);
        }
        return {
            User: {
                id: userId,
            },
        };
    })
    .macro(({ onBeforeHandle }) => ({
        isProtected: (required?: boolean) => {
            onBeforeHandle(async ({ User, error }) => {
                if (required !== true) {
                    return;
                }
                if (User?.id === null || User?.id === undefined) {
                    return error(401, "Unauthorized");
                }
            });
        },
    }));
