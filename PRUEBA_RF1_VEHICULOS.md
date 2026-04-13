# 🚗 Prueba Completa RF1 - Registro de Vehículos

## Estado Actual
- ✅ Base de datos: 8 tablas RF1 con soft deletes
- ✅ Backend: Controlador actualizado con FormData JSON parsing
- ✅ Frontend: Formulario 4-pasos con 13 tipos de fotos
- ✅ Cloudinary: Credenciales configuradas en `.env`
- ✅ Validación: PASO 1 requerido (5 campos), PASO 2-4 opcionales

## Lógica de Validación

### ✅ PASO 1: Información Básica (REQUERIDO)
- `propietario_nombre` - Requerido
- `placa` - Requerido
- `numero_serie` - Requerido
- `marca` - Requerido
- `modelo` (año) - Requerido

### ⚠️ PASO 2: Documentos (OPCIONAL)
- Puede dejar vacío
- Puede agregar múltiples documentos
- Cada documento requiere: tipo, ámbito, estado, dependencia, vigencia_desde, vigencia_hasta, folio
- Vigencia expirada genera ⚠️ aviso pero NO impide guardar

### ⚠️ PASO 3: Elementos de Seguridad (OPCIONAL)
- 11 elementos de seguridad
- Puede dejar vacío
- Puede marcar: Sí / No / No Aplica
- Puede agregar observaciones

### ⚠️ PASO 4: Fotografías (OPCIONAL)
- 13 tipos de fotos
- Puede dejar vacío
- Puede subir 1 a 13 fotos
- Max 5MB por foto
- Puede agregar descripción opcional

## Flujo de Prueba

### 1️⃣ Terminal 1: Iniciar Backend
```bash
cd d:\Verdemex\software-verdemex\backend
npm run dev
```
Esperar a ver: `✅ Servidor ejecutándose en puerto 3000`

### 2️⃣ Terminal 2: Iniciar Frontend
```bash
cd d:\Verdemex\software-verdemex\frontend
npm run dev
```
Esperar a ver: `Local: http://localhost:5173`

### 3️⃣ Browser: Abrir http://localhost:5173

### 4️⃣ Iniciar Sesión
- Email: `admin@verdemex.local`
- Contraseña: `admin123`

### 5️⃣ Ir a Vehículos → Crear Nuevo

### 6️⃣ PASO 1: Llenar Información Básica
```
Propietario: Verdemex S.A.
Placa: VX-TEST-2025
Número de serie: 1234567890ABCDEF
Marca: Volvo
Modelo (Año): 2023
Color: Blanco
Capacidad (kg): 5000
Descripción: Vehículo de prueba RF1
```

### 7️⃣ PASO 2: Documentos (OPCIONAL)
- Opción A: Dejar vacío y continuar
- Opción B: Agregar 1 documento:
  - Tipo: SOAT
  - Ámbito: Nacional
  - Dependencia: Asegurador
  - Vigencia Desde: 2024-01-01
  - Vigencia Hasta: 2025-01-01
  - Folio: 12345-67890

### 8️⃣ PASO 3: Elementos Seguridad (OPCIONAL)
- Opción A: Dejar vacío y continuar
- Opción B: Marcar Sí/No/No Aplica en algunos elementos

### 9️⃣ PASO 4: Fotografías (OPCIONAL)
- Opción A: Dejar vacío y continuar
- Opción B: Subir 1-2 fotos:
  - Click en "Frente" → Seleccionar imagen
  - Ver preview
  - Opcionalmente agregar descripción
  - Repetir para "Parte Trasera"

### 🔟 PASO 5: Guardar
- Click "Guardar Vehículo"
- Ver modal de confirmación
- Click "Sí, guardar"
- Esperar respuesta del servidor

## Respuestas Esperadas

### ✅ Éxito (201 Created)
```json
{
  "message": "Vehículo registrado correctamente",
  "vehicle": {
    "id": "...",
    "propietario_nombre": "Verdemex S.A.",
    "placa": "VX-TEST-2025",
    ...
    "documentos": [],
    "elementos_seguridad": [],
    "fotografias": []
  },
  "summary": {
    "basicInfoComplete": true,
    "documentsCreated": 0 o más,
    "safetyElementsCreated": 0 o más,
    "photosUploaded": 0 o más
  }
}
```

### ❌ Error: Campos Requeridos Faltando (400)
```json
{
  "message": "Faltan campos requeridos en PASO 1",
  "missingFields": ["Placa", "Número de Serie"]
}
```

### ❌ Error: Placa Duplicada (400)
```json
{
  "message": "Placa ya existe en el sistema",
  "error": "..."
}
```

## Checklist de Verificación

### Console del Navegador (F12 → Console)
- [ ] ✅ Log: "📤 Enviando vehículo al backend..."
- [ ] ✅ Response con `vehicle` object completo
- [ ] ✅ Alert de éxito mostrando conteo de documentos/seguridad/fotos

### Terminal del Backend
- [ ] ✅ Log: "📥 Datos recibidos: { basicInfo, documents, safetyElements }"
- [ ] ✅ Para cada documento: "✅ Documento creado: SOAT"
- [ ] ✅ Para cada elemento: "✅ Elemento seguridad: Extintor"
- [ ] ✅ Para cada foto: "✅ Foto upload: frente → Cloudinary"
- [ ] ✅ URL de Cloudinary en logs

### Cloudinary Dashboard
- [ ] ✅ https://cloudinary.com/console
- [ ] ✅ Carpeta "verdemex" creada
- [ ] ✅ Subcarpeta con nombre del vehículo (vehiculo_${id})
- [ ] ✅ Imágenes subidas con naming: vehicle_${id}_${tipo_foto}_${timestamp}

### Base de Datos Supabase
- [ ] ✅ Tabla `vehiculos`: nuevo registro con placa VX-TEST-2025
- [ ] ✅ Tabla `vehiculo_documentos`: documento(s) si agregaron
- [ ] ✅ Tabla `vehiculo_elementos_seguridad`: elemento(s) si agregaron
- [ ] ✅ Tabla `vehiculo_fotografias`: foto(s) con URLs de Cloudinary

## Casos de Prueba Avanzados

### Test 1: Solo PASO 1 (Mínimo)
- Llenar PASO 1 ✓
- Dejar PASO 2-4 vacíos ✓
- Guardar → Debe funcionar ✓

### Test 2: PASO 1 + Documentos
- Llenar PASO 1 ✓
- Agregar 2-3 documentos ✓
- Dejar PASO 3-4 vacíos ✓
- Guardar → Documentos deben guardarse ✓

### Test 3: Vigencia Expirada
- PASO 2: Agregar documento con fecha vigencia expirada
- Guardar → Debe guardar con ⚠️ aviso, NO fallar ✓

### Test 4: Múltiples Fotos
- PASO 4: Subir 3 fotos diferentes
- Agregar descripción a cada una
- Guardar → Los 3 archivos en Cloudinary, URLs en BD ✓

### Test 5: Cambiar Foto
- PASO 4: Subir "Frente"
- Click "🔄 Cambiar Foto" → Seleccionar otra imagen
- Preview debe actualizar ✓
- Guardar → Nueva imagen debe estar en Cloudinary ✓

## Troubleshooting

### 🔴 Error 500 en Backend
```
❌ Error creando vehículo: Error: ...
```
**Solución:** 
- Revisar console del backend
- Verificar que DATABASE_URL sea correcto
- Verificar que CLOUDINARY_* env vars existan
- Restart: `npm run dev`

### 🔴 FormData Parse Error
```
SyntaxError: Unexpected token ...
```
**Solución:**
- El JSON enviado desde frontend está malformado
- Agregar console.log en backend: `console.log(req.body)`
- Verificar que basicInfo/documents/safetyElements sean JSON strings

### 🔴 Cloudinary Upload Failed
```
Error uploading to Cloudinary: ...
```
**Solución:**
- Verificar credenciales en backend/.env
- Verificar que archivo sea < 5MB
- Verificar que sea imagen (MIME type válido)
- Revisar límite de archivos en Cloudinary account

### 🔴 Placa Duplicada
```
Placa ya existe en el sistema
```
**Solución:**
- Cambiar placa a única
- O eliminar registro anterior en Supabase (soft delete)

## Scripts Útiles

### Ver logs de backend en tiempo real
```bash
cd backend
npm run dev 2>&1 | grep -E "📥|✅|❌|⚠️"
```

### Limpiar Cloudinary (folder verdemex)
- Ir a: https://cloudinary.com/console/media_library
- Seleccionar folder "verdemex"
- Delete (solo para prueba)

### Query Supabase para ver vehículos
```sql
SELECT id, placa, propietario_nombre, estado, created_at 
FROM vehiculos 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC
```

---

## 🎯 Meta: Completar prueba sin errores

Cuando todo funcione sin errores:
1. ✅ Vehículo guardado en Supabase
2. ✅ Documentos guardados (si aplicable)
3. ✅ Elementos seguridad guardados (si aplicable)
4. ✅ Fotos guardadas en Cloudinary + URLs en BD
5. ✅ Usuario redirigido a listado de vehículos
6. ✅ Mensaje de éxito mostrado "✓ Vehículo registrado correctamente"

---

**Estado: Listo para prueba**
Actualizado: 2024-11-27
Backend: Actualizado ✅
Frontend: Actualizado ✅
Base de datos: Configurada ✅
