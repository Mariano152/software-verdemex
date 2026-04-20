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

async function checkUsers() {
  try {
    await client.connect();
    console.log('\n👥 Verificando usuarios en la base de datos...\n');
    
    const res = await client.query('SELECT id, email, first_name, last_name, created_at FROM users;');
    
    if (res.rows.length === 0) {
      console.log('❌ No hay usuarios en la BD');
    } else {
      console.log(`✓ Se encontraron ${res.rows.length} usuario(s):`);
      res.rows.forEach(user => {
        console.log(`  - Email: ${user.email} (${user.first_name} ${user.last_name})`);
      });
    }
    
    console.log('\n');
  } finally {
    await client.end();
  }
}

checkUsers().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
