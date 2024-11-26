import "dotenv/config";
import { defineConfig } from "drizzle-kit";

let dbInformation:
    | {
          dialect: "turso";
          dbCredentials: {
              url: string;
              authToken: string;
          };
      }
    | {
          dialect: "sqlite";
          dbCredentials: {
              url: string;
          };
      } = {
    dialect: "turso",
    dbCredentials: {
        url: process.env.TURSO_CONNECTION_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
    },
};

if (process.env.DB_TYPE === "local") {
    dbInformation = {
        dialect: "sqlite",
        dbCredentials: {
            url: process.env.DB_LOCAL_URL!,
        },
    };
}

export default defineConfig({
    out: "./drizzle",
    schema: "./src/schema.ts",
    ...dbInformation,
});
