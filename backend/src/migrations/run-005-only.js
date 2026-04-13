import fs from 'fs';
import path from 'path';
import { query } from '../config/database.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration005() {
  try {
    console.log('📄 Ejecutando SOLO migración 005...\n');

    // Leer archivo 005
    const sql = fs.readFileSync(path.join(__dirname, '005_add_estado_column.sql'), 'utf-8');
    
    // Dividir por ; pero filtrar comentarios y espacios
    const allStatements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    console.log(`📊 Encontrados ${allStatements.length} statements\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allStatements.length; i++) {
      const statement = allStatements[i];
      try {
        const preview = statement.substring(0, 70).replace(/\n/g, ' ');
        console.log(`[${i + 1}/${allStatements.length}] ${preview}...`);
        await query(statement);
        console.log('✅ OK\n');
        successCount++;
      } catch (error) {
        console.error('❌ Error:', error.message, '\n');
        errorCount++;
      }
    }

    console.log(`\n📊 Resultados finales:`);
    console.log(`   ✅ Exitosas: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log('\n✓ Migración 005 completada\n');

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
  }

  process.exit(0);
}

runMigration005();
