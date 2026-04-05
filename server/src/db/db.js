/*
db.js connects the Node.js server to PostgreSQL, 
providing the bridge between backend and database 
by managing a connection pool
*/

import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Create connection pool
const pool = new Pool({
   user: process.env.DB_USER,
   host: process.env.DB_HOST,
   database: process.env.DB_NAME,
   password: process.env.DB_PASSWORD,
   port: process.env.DB_PORT, 
});

// Test Database connection
export async function testDbConnection(){
    try{
        const result = await pool.query('SELECT NOW()');
        console.log('DB successfully connected:', result.rows[0].now);
    }catch(error){
        console.error('DB failed to connect:', error.message);
        process.exit(1); // stop server upon fail
    }
}

export default pool;