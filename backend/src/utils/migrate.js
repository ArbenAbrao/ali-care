
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function migrate() {
  const connection = await db.getConnection();

  try {
    console.log('Starting ALI-CARE database migration...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(190) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const directory = path.resolve(__dirname, '../../migrations');

    if (!fs.existsSync(directory)) {
      throw new Error(`Migration directory not found: ${directory}`);
    }

    const files = fs.readdirSync(directory)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    for (const file of files) {
      const [existing] = await connection.execute(
        'SELECT name FROM schema_migrations WHERE name = ?',
        [file]
      );

      if (existing.length > 0) {
        console.log(`Already applied: ${file}`);
        continue;
      }

      console.log(`Applying: ${file}`);

      const filePath = path.join(directory, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      const statements = sql
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0);

      // MySQL DDL statements may commit automatically.
      // Execute sequentially and record only after completion.
      for (const statement of statements) {
        await connection.query(statement);
      }

      await connection.execute(
        'INSERT INTO schema_migrations (name) VALUES (?)',
        [file]
      );

      console.log(`Completed: ${file}`);
    }

    console.log('ALI-CARE database migration completed.');

  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;

  } finally {
    connection.release();
  }
}

migrate()
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end();
  });
