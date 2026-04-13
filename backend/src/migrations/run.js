import fs from 'fs';
import path from 'path';
import { query } from '../config/database.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Leer todos los archivos .sql en orden
const migrationFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`🔄 Ejecutando ${migrationFiles.length} archivos de migración...`);

for (const file of migrationFiles) {
  try {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf-8');
    const statements = sql.split(';').filter(s => s.trim());

    console.log(`\n📄 ${file}:`);
    for (const statement of statements) {
      try {
        await query(statement);
        console.log('✅ ' + statement.substring(0, 50).trim() + '...');
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading ${file}:`, error.message);
  }
}

console.log('\n✅ Migraciones completadas');
process.exit(0);
