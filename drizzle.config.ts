import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// Suporta DATABASE_URL, DB_URL e CUSTOM_DB_URL
const connectionString = process.env.DATABASE_URL || process.env.DB_URL || process.env.CUSTOM_DB_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL or DB_URL is required to run drizzle commands");
}

// Detecta o dialect baseado na URL de conexão
const dialect = connectionString.startsWith("postgresql") || connectionString.startsWith("postgres")
  ? "postgresql"
  : "mysql";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: dialect as "mysql" | "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
