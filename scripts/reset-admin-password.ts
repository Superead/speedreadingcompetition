// Set a new password for an ADMIN or TEACHER account.
// Usage: npx tsx --env-file=.env scripts/reset-admin-password.ts <email> <new-password>
import pg from "pg";
import bcrypt from "bcryptjs";

const [email, newPassword] = process.argv.slice(2);
if (!email || !newPassword) {
  console.error("Usage: npx tsx --env-file=.env scripts/reset-admin-password.ts <email> <new-password>");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const hash = await bcrypt.hash(newPassword, 10);
const result = await pool.query(
  `update users set password_hash = $1 where email = $2 and role in ('ADMIN', 'TEACHER') returning email, role`,
  [hash, email],
);
await pool.end();

if (result.rows.length === 0) {
  console.error(`No admin/teacher account found for ${email}`);
  process.exit(1);
}
console.log(`Password updated for ${result.rows[0].email} (${result.rows[0].role})`);
