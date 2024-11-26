import { drizzle as drizzleTurso } from "drizzle-orm/libsql/http";
import { migrate as migrateTurso } from "drizzle-orm/libsql/migrator";

import { drizzle as drizzleLocal } from "drizzle-orm/bun-sqlite";
import { migrate as migrateLocal } from "drizzle-orm/bun-sqlite/migrator";

import { todoBuckets, todoItemAttachments, todoItems, users } from "./schema";
import * as bun from "bun";

const isLocalDB = bun.env.DB_TYPE === "local";

const schema = {
    users,
    todoBuckets,
    todoItems,
    todoItemAttachments,
} as const;

const factoryDB = (isLocal: boolean) => {
    if (!isLocal) {
        const url = bun.env.TURSO_CONNECTION_URL;
        const authToken = bun.env.TURSO_AUTH_TOKEN;

        if (!url || !authToken) {
            throw new Error("Missing TURSO_CONNECTION_URL or TURSO_AUTH_TOKEN");
        }

        const instance = drizzleTurso({
            connection: { url, authToken },
            schema,
        });

        void migrateTurso(instance, { migrationsFolder: "drizzle" });
        return instance;
    }

    const url = bun.env.DB_LOCAL_URL;
    if (!url) {
        throw new Error("Missing DB_LOCAL_URL");
    }

    const instance = drizzleLocal(url, { schema });
    void migrateLocal(instance, { migrationsFolder: "drizzle" });
    return instance;
};

const db = factoryDB(isLocalDB);

export default db;
