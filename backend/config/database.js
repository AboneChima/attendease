const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config();

let pool;
let dbType;

// Determine database type based on environment
if (process.env.DATABASE_URL) {
  // PostgreSQL for production (Render)
  dbType = 'postgresql';
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else if (process.env.DB_HOST) {
  // MySQL for development
  dbType = 'mysql';
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qr_attendance',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
  pool = mysql.createPool(dbConfig);
} else {
  // Fallback to SQLite adapter
  dbType = 'sqlite';
  const sqliteAdapter = require('./sqlite-database');
  pool = sqliteAdapter.pool;
}

// Test database connection
const testConnection = async () => {
  try {
    if (dbType === 'postgresql') {
      const client = await pool.connect();
      console.log('PostgreSQL database connected successfully');
      client.release();
    } else if (dbType === 'mysql') {
      const connection = await pool.getConnection();
      console.log('MySQL database connected successfully');
      connection.release();
    } else {
      console.log('SQLite database initialized successfully');
    }
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

module.exports = { pool, testConnection, dbType };