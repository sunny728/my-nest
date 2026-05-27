import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function handleDatabaseQuery(args: {
  name?: string;
  role?: string;
  limit?: number;
}) {
  const { name, role, limit = 10 } = args;
  const condition: string[] = [];
  if (name) {
    condition.push(`name ILIKE '%${name}%'`);
  }
  if (role) {
    condition.push(`roles = '${role}'`);
  }
  const query = `
    SELECT id, name, roles
    FROM users
    ${condition.length > 0 ? 'WHERE ' + condition.join(' AND ') : ''}
    LIMIT ${limit}
  `;
  const res = await pool.query(query);
  const users = res.rows;

  const userList = users
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .map((user) => `ID: ${user.id}, Name: ${user.name}, Role: ${user.roles}`)
    .join('\n');
  return `Found ${users.length} user(s): \n ${userList}`;
}
