// Checks the settings in .env when the server starts.
// If something is missing or wrong, the server stops with a clear message
// instead of failing later in a confusing way.
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  MONGODB_URI: z.string().min(1, "is required (e.g. mongodb://127.0.0.1:27017/workabroadhub)"),
  JWT_SECRET:  z.string().min(32, "must be at least 32 characters (make one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\")"),
  PORT:        z.coerce.number().int().positive().default(4000),
  NODE_ENV:    z.enum(["development", "production", "test"]).default("development"),
  APP_URL:     z.url().default("http://localhost:4000"),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  console.error("\n❌ Your .env settings have a problem:");
  for (const issue of result.error.issues) console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  console.error("   Fix .env (see .env.example) and start the server again.\n");
  process.exit(1);
}

export const env = result.data;
// keep process.env in step, so older code that reads it sees the same values
process.env.NODE_ENV = env.NODE_ENV;
export const isProd = env.NODE_ENV === "production";
