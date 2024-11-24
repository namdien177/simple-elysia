import { drizzle } from "drizzle-orm/libsql/http";
import env from "./env";
import { todoBuckets, todoItemAttachments, todoItems, users } from "./schema";
import { migrate } from "drizzle-orm/libsql/migrator";

const db = drizzle({
    connection: {
        url: env.TURSO_CONNECTION_URL,
        authToken: env.TURSO_AUTH_TOKEN,
    },
    schema: {
        users,
        todoBuckets,
        todoItems,
        todoItemAttachments,
    },
});

void migrate(db, { migrationsFolder: "drizzle" });

export default db;
