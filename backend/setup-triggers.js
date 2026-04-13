import { query } from './src/config/database.js';

async function setupTriggers() {
  try {
    console.log('⏳ Creando función update_updated_at_column...');
    
    await query(`
      CREATE OR REPLACE FUNCTION public.update_updated_at_column() 
      RETURNS TRIGGER LANGUAGE plpgsql AS
      'BEGIN NEW.updated_at = NOW(); RETURN NEW; END'
    `);
    console.log('✅ Función creada');

    const tables = [
      'vehiculos',
      'catalogo_tipos_documento_vehicular',
      'vehiculo_documentos',
      'catalogo_elementos_seguridad',
      'vehiculo_elementos_seguridad',
      'vehiculo_fotografias',
      'vehiculo_incidencias',
      'vehiculo_historial_estatus',
      'users'
    ];

    for (const table of tables) {
      const triggerName = `${table}_update_timestamp`;
      try {
        // Primero intentar CREAR TRIGGER sin IF NOT EXISTS
        await query(`
          DROP TRIGGER IF EXISTS ${triggerName} ON public.${table}
        `);
        
        await query(`
          CREATE TRIGGER ${triggerName}
          BEFORE UPDATE ON public.${table}
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()
        `);
        console.log(`✅ Trigger ${triggerName} creado`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️  Trigger ${triggerName} ya existe`);
        } else {
          console.error(`❌ Error en ${triggerName}: ${err.message}`);
        }
      }
    }

    console.log('\n✅ TODOS LOS TRIGGERS CREADOS EXITOSAMENTE');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupTriggers();
