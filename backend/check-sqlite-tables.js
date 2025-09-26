const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 CHECKING SQLITE DATABASE TABLES');
console.log('==================================\n');

// Get all tables in the database
db.all(`
  SELECT name FROM sqlite_master 
  WHERE type='table' 
  ORDER BY name
`, (err, tables) => {
  if (err) {
    console.error('❌ Error fetching tables:', err.message);
    return;
  }
  
  console.log(`📊 Total tables found: ${tables.length}`);
  console.log('📋 Tables:');
  
  if (tables.length === 0) {
    console.log('   ❌ No tables found in database');
    db.close();
    return;
  }
  
  tables.forEach((table, index) => {
    console.log(`   ${index + 1}. ${table.name}`);
  });
  
  console.log('\n');
  
  // Check each table's structure and sample data
  let processedTables = 0;
  
  tables.forEach((table, index) => {
    console.log(`${index + 1}. TABLE: ${table.name.toUpperCase()}`);
    console.log('   ' + '='.repeat(table.name.length + 8));
    
    // Get table schema
    db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
      if (err) {
        console.error(`   ❌ Error getting schema for ${table.name}:`, err.message);
      } else {
        console.log('   📋 Columns:');
        columns.forEach(col => {
          console.log(`      - ${col.name} (${col.type}${col.notnull ? ', NOT NULL' : ''}${col.pk ? ', PRIMARY KEY' : ''})`);
        });
      }
      
      // Get sample data (first 3 rows)
      db.all(`SELECT * FROM ${table.name} LIMIT 3`, (err, rows) => {
        if (err) {
          console.error(`   ❌ Error getting data from ${table.name}:`, err.message);
        } else {
          console.log(`   📊 Sample data (${rows.length} rows):`);
          if (rows.length === 0) {
            console.log('      (empty table)');
          } else {
            rows.forEach((row, rowIndex) => {
              console.log(`      Row ${rowIndex + 1}:`, JSON.stringify(row, null, 2).replace(/\n/g, '\n        '));
            });
          }
        }
        
        console.log('\n');
        processedTables++;
        
        // Close database when all tables are processed
        if (processedTables === tables.length) {
          console.log('✅ Database inspection complete');
          db.close();
        }
      });
    });
  });
});