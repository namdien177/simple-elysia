import { drizzle } from "drizzle-orm/bun-sqlite";
import env from "./env";
import { todoItemAttachments, todoItems, todoBuckets, users } from "./schema";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const db = drizzle(env.DB_FILE_NAME, {
    schema: {
        users,
        todoBuckets,
        todoItems,
        todoItemAttachments,
    },
});

migrate(db, { migrationsFolder: "drizzle" });

export default db;
