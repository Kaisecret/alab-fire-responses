import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { Pool } from "pg";

const required = ["DATABASE_URL", "PROVINCIAL_BFP_EMAIL", "PROVINCIAL_BFP_NAME", "PROVINCIAL_BFP_TEMP_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} is required. No account was created.`);
}

const email = process.env.PROVINCIAL_BFP_EMAIL.trim().toLowerCase();
const displayName = process.env.PROVINCIAL_BFP_NAME.trim();
const temporaryPassword = process.env.PROVINCIAL_BFP_TEMP_PASSWORD;
if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("PROVINCIAL_BFP_EMAIL must be a valid email address.");
if (displayName.length < 2 || displayName.length > 100) throw new Error("PROVINCIAL_BFP_NAME must contain 2 to 100 characters.");
if (temporaryPassword.length < 12) throw new Error("PROVINCIAL_BFP_TEMP_PASSWORD must contain at least 12 characters.");

function hashPassword(password) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => scrypt(password, salt, 64, (error, derivedKey) => {
    if (error) reject(error);
    else resolve(`scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`);
  }));
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const client = await pool.connect();
try {
  await client.query("begin");
  const existing = await client.query("select id from users where role = 'PROVINCIAL_BFP' limit 1");
  if (existing.rowCount) throw new Error("A Provincial BFP account already exists. No account was created.");
  const userId = randomUUID();
  const profileId = randomUUID();
  const passwordHash = await hashPassword(temporaryPassword);
  await client.query(
    `insert into users (id, email, password_hash, role, account_status, created_at, updated_at)
     values ($1, $2, $3, 'PROVINCIAL_BFP', 'ACTIVE', now(), now())`,
    [userId, email, passwordHash],
  );
  await client.query(
    `insert into bfp_personnel_profiles (id, user_id, display_name, must_change_password, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [profileId, userId, displayName],
  );
  await client.query(
    `insert into bfp_credential_events (target_user_id, event_type, metadata)
     values ($1, 'ACCOUNT_ISSUED', '{"bootstrap":true}'::jsonb)`,
    [userId],
  );
  await client.query("commit");
  console.log(`Provincial BFP account created for ${email}. The temporary password was not printed.`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
