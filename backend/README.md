# Verdemex Backend

Backend para sistema de gestión de flota de transporte.

## Stack
- Node.js 20 LTS
- Express.js
- PostgreSQL 15+ (Render)
- Cloudinary

## Estructura (Layered Architecture)

```
src/
├── config/          → Configuraciones (BD, Cloudinary)
├── middleware/      → Procesamiento intermedio
├── controllers/     → Lógica de negocio
├── models/          → Queries a BD
├── routes/          → Definición de endpoints
└── migrations/      → Scripts SQL
```

## Instalación

1. Copiar `.env.example` a `.env`
2. Llenar variables de entorno
3. `npm install`
4. Ejecutar migraciones
5. `npm run dev`
