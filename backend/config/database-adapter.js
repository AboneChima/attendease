const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const { getDatabase } = require('./sqlite-database');

class DatabaseAdapter {
  constructor() {
    // Determine database type based on environment
    if (process.env.DATABASE_URL) {
      this.dbType = 'postgresql';
    } else if (process.env.DB_HOST) {
      this.dbType = 'mysql';
    } else {
      this.dbType = process.env.DB_TYPE || 'sqlite';
    }
    
    this.mysqlPool = null;
    this.postgresPool = null;
    this.sqliteDb = null;
  }

  async initialize() {
    if (this.dbType === 'postgresql') {
      this.postgresPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
    } else if (this.dbType === 'mysql') {
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
    if (this.dbType === 'postgresql') {
      if (!this.postgresPool) await this.initialize();
      
      // Convert MySQL-style placeholders (?) to PostgreSQL-style ($1, $2, etc.)
      let pgQuery = query;
      let pgParams = params;
      
      if (params.length > 0) {
        let paramIndex = 1;
        pgQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
      }
      
      const result = await this.postgresPool.query(pgQuery, pgParams);
      
      // Handle different query types
      if (query.startsWith('SELECT')) {
        return [result.rows]; // Return in MySQL format [rows, fields]
      } else if (query.startsWith('INSERT')) {
        // For INSERT queries, we need to add RETURNING id if not already present
        if (!pgQuery.includes('RETURNING')) {
          // Remove any trailing semicolon and whitespace, then add RETURNING id
          pgQuery = pgQuery.replace(/;?\s*$/, '') + ' RETURNING id';
          console.log('PostgreSQL INSERT Query:', pgQuery);
          console.log('PostgreSQL INSERT Params:', pgParams);
          const insertResult = await this.postgresPool.query(pgQuery, pgParams);
          console.log('PostgreSQL INSERT Result:', insertResult.rows);
          return [{ insertId: insertResult.rows[0]?.id || null, affectedRows: insertResult.rowCount }];
        } else {
          return [{ insertId: result.rows[0]?.id || null, affectedRows: result.rowCount }];
        }
      } else if (query.startsWith('UPDATE') || query.startsWith('DELETE')) {
        return [{ insertId: null, affectedRows: result.rowCount }];
      }
      
      return [result.rows];
    } else if (this.dbType === 'mysql') {
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

  async get(query, params = []) {
    if (this.dbType === 'postgresql') {
      if (!this.postgresPool) await this.initialize();
      
      // Convert MySQL-style placeholders to PostgreSQL-style
      let pgQuery = query;
      if (params.length > 0) {
        let paramIndex = 1;
        pgQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
      }
      
      const result = await this.postgresPool.query(pgQuery, params);
      return result.rows[0] || null;
    } else if (this.dbType === 'mysql') {
      if (!this.mysqlPool) await this.initialize();
      const [rows] = await this.mysqlPool.execute(query, params);
      return rows[0] || null;
    } else {
      if (!this.sqliteDb) await this.initialize();
      return await this.sqliteDb.get(query, params);
    }
  }

  async all(query, params = []) {
    if (this.dbType === 'postgresql') {
      if (!this.postgresPool) await this.initialize();
      
      // Convert MySQL-style placeholders to PostgreSQL-style
      let pgQuery = query;
      if (params.length > 0) {
        let paramIndex = 1;
        pgQuery = query.replace(/\?/g, () => `$${paramIndex++}`);
      }
      
      const result = await this.postgresPool.query(pgQuery, params);
      return result.rows;
    } else if (this.dbType === 'mysql') {
      if (!this.mysqlPool) await this.initialize();
      const [rows] = await this.mysqlPool.execute(query, params);
      return rows;
    } else {
      if (!this.sqliteDb) await this.initialize();
      return await this.sqliteDb.all(query, params);
    }
  }

  async close() {
    if (this.dbType === 'postgresql' && this.postgresPool) {
      await this.postgresPool.end();
    } else if (this.dbType === 'mysql' && this.mysqlPool) {
      await this.mysqlPool.end();
    } else if (this.sqliteDb) {
      await this.sqliteDb.close();
    }
  }
}

// Create singleton instance
const dbAdapter = new DatabaseAdapter();

module.exports = { dbAdapter };