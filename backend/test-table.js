import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehiculo_documento_archivos')")
  .then(res => {
    console.log('✅ Table exists:', res.rows[0].exists);
    if (res.rows[0].exists) {
      return pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vehiculo_documento_archivos' ORDER BY ordinal_position");
    }
  })
  .then(res => {
    if (res) {
      console.log('\n📋 Table columns:');
      res.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
