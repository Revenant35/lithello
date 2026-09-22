import { betterAuth } from "better-auth";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

export const auth = betterAuth({
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  baseURL: process.env.BETTER_AUTH_URL,
  database: {
    dialect: new PostgresJSDialect({
      postgres: postgres({
        host: process.env.POSTGRES_HOST,
        port: Number(process.env.POSTGRES_PORT),
        database: process.env.POSTGRES_DB,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
      }),
    }),
    type: "postgres",
  },
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
});
