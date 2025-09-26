const mysql = require('mysql2/promise');
const { getDatabase } = require('./sqlite-database');

class DatabaseAdapter {
  constructor() {
    this.dbType = process.env.DB_TYPE || 'sqlite';
    this.mysqlPool = null;
    this.sqliteDb = null;
  }

  async initialize() {
    if (this.dbType === 'mysql') {
      this.mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'qr_attendance',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    } else {
      this.sqliteDb = await getDatabase();
    }
  }

  async execute(query, params = []) {
    if (this.dbType === 'mysql') {
      if (!this.mysqlPool) await this.initialize();
      return await this.mysqlPool.execute(query, params);
    } else {
      if (!this.sqliteDb) await this.initialize();
      
      // Convert MySQL-style queries to SQLite-compatible ones
      let sqliteQuery = query;
      
      // Handle INSERT queries
      if (query.includes('INSERT INTO') && query.includes('VALUES')) {
        // SQLite uses different syntax for some operations
        sqliteQuery = query;
      }
      
      // Handle SELECT queries
      if (query.startsWith('SELECT')) {
        const result = await this.sqliteDb.all(sqliteQuery, params);
        return [result]; // Return in MySQL format [rows, fields]
      }
      
      // Handle INSERT/UPDATE/DELETE queries
      if (query.startsWith('INSERT') || query.startsWith('UPDATE') || query.startsWith('DELETE')) {
        const result = await this.sqliteDb.run(sqliteQuery, params);
        return [{ insertId: result.lastID, affectedRows: result.changes }];
      }
      
      // Default case
      const result = await this.sqliteDb.all(sqliteQuery, params);
      return [result];
    }
  }

  async close() {
    if (this.dbType === 'mysql' && this.mysqlPool) {
      await this.mysqlPool.end();
    } else if (this.sqliteDb) {
      await this.sqliteDb.close();
    }
  }
}

// Create singleton instance
const dbAdapter = new DatabaseAdapter();

module.exports = { dbAdapter };