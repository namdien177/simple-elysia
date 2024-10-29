import { Static, Type as t } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import * as bun from "bun";

const envSchema = t.Object({
    AUTH_SECRET: t.String({ minLength: 2 }),
    DB_FILE_NAME: t.String({ minLength: 2 }),
});

export type ENV = Static<typeof envSchema>;

const env = Value.Parse(envSchema, bun.env);

export default env;
