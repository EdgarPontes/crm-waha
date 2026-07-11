export const ENV = {
  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",
  dbType: process.env.DB_TYPE ?? "mysql",
  dbHost: process.env.DB_HOST ?? "",
  dbPort: parseInt(process.env.DB_PORT ?? "3306"),
  dbUser: process.env.DB_USER ?? "",
  dbPassword: process.env.DB_PASSWORD ?? "",
  dbName: process.env.DB_NAME ?? "",

  // Auth
  sessionSecret:
    process.env.SESSION_SECRET ?? "dev-secret-change-in-production",
  isProduction: process.env.NODE_ENV === "production",

  // WAHA
  wahaApiUrl: process.env.WAHA_API_URL ?? "http://localhost:3001",
  wahaApiKey: process.env.WAHA_API_KEY ?? "",

  // AI Providers
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  claudeApiKey: process.env.CLAUDE_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",

  // App
  appTitle: process.env.VITE_APP_TITLE ?? "CRM Omnichannel WAHA",
  appLogo: process.env.VITE_APP_LOGO ?? "",
};
