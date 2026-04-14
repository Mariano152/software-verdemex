import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

const client = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false,
});

async function checkTables() {
  try {
    await client.connect();
    console.log('\n📊 Verificando tablas en la base de datos...\n');
    
    const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('Tablas encontradas:');
    res.rows.forEach(row => console.log('  ✓', row.table_name));
    
    // Verificar estructura de vehiculos si existe
    if (res.rows.some(r => r.table_name === 'vehiculos')) {
      console.log('\n📋 Columnas de tabla vehiculos:');
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'vehiculos' 
        ORDER BY ordinal_position;
      `);
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)'}`);
      });
    }
    
    console.log('\n');
  } finally {
    await client.end();
  }
}

checkTables().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
