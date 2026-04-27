/*
db.js connects the Node.js server to PostgreSQL.

It creates a reusable connection pool so your backend routes can run SQL queries
without opening a brand new database connection every time.
*/

import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction
          ? {
              rejectUnauthorized: false,
            }
          : false,
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT) || 5432,
      }
);

export async function testDbConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('DB successfully connected:', result.rows[0].now);
  } catch (error) {
    console.error('DB failed to connect:', error);
    process.exit(1);
  }
}

export default pool;