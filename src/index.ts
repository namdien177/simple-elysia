import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import env from "./env";
import bearer from "@elysiajs/bearer";
import { logger } from "@bogeychan/elysia-logger";
import cors from "@elysiajs/cors";
import authModule from "./modules/auth.module";
import userModule from "./modules/user.module";
import bucketModule from "./modules/bucket.module";
import bucketItemModule from "./modules/bucket-item.module";

const app = new Elysia()
    .use(
        cors({
            origin: "*",
        }),
    )
    .use(
        jwt({
            secret: env.AUTH_SECRET,
        }),
    )
    .use(bearer())
    .use(
        swagger({
            // provider: 'swagger-ui',
            documentation: {
                tags: [
                    { name: "Auth", description: "Authentication endpoints" },
                    { name: "User", description: "User endpoints" },
                    { name: "Bucket", description: "Bucket endpoints" },
                    {
                        name: "Bucket Items",
                        description: "Bucket Item endpoints",
                    },
                ],
            },
        }),
    )
    .use(
        logger({
            timestamp: true,
        }),
    )
    .use(authModule)
    .use(userModule)
    .use(bucketModule)
    .use(bucketItemModule)
    .listen(process.env.PORT ?? 3000, (server) => {
        console.log(`Server started on port ${server.port}`);
        console.log(
            `Swagger UI available at http://${server.hostname}:${server.port}/swagger`,
        );
    });
