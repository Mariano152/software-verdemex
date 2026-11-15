# Dashboard de ventas de Odoo

## Configuración

Agrega estas variables al entorno del backend (localmente, en `backend/.env`; en producción, en el proveedor donde se ejecuta el backend):

```env
ODOO_URL=https://verdemex.somoslink.com.mx/odoo
# Opcional; el backend detecta automáticamente que /odoo usa /jsonrpc en la raíz
# ODOO_RPC_URL=https://verdemex.somoslink.com.mx
ODOO_DATABASE=nombre_de_la_base
ODOO_USERNAME=usuario_de_integracion@verdemex.com
ODOO_API_KEY=llave_api_del_usuario
```

La llave se genera desde las preferencias de seguridad del usuario en Odoo. Conviene utilizar un usuario de integración con acceso de solo lectura a Ventas, Contactos y Productos. Nunca se debe agregar la llave a las variables `VITE_*` ni al frontend.

Después de cambiar las variables, reinicia el backend. El módulo aparecerá como **Ventas Odoo** en el menú para quienes tengan el permiso `analytics.view`.

## Información consultada

- Órdenes y cotizaciones (`sale.order`): importes, impuestos, estado, fechas, cliente, vendedor, equipo, compañía, moneda y facturación.
- Líneas (`sale.order.line`): producto, cantidades solicitadas/entregadas/facturadas, precio, descuento, impuestos y totales.
- Comparación automática contra el periodo inmediatamente anterior de la misma duración.
- Agrupación visual por semana, mes, trimestre o año.
- Filtros por fecha, estado, vendedor, equipo, cliente y compañía.
- Rankings de clientes, vendedores y productos, detalle de órdenes y exportación CSV.

## Diagnóstico

- `La integración de Odoo no está configurada`: falta una o más variables requeridas.
- `Odoo rechazó las credenciales`: valida base, usuario y llave API.
- Error de campo o permisos: concede lectura a Ventas, Contactos y Productos al usuario de integración.
- Error 404 en `jsonrpc`: configura `ODOO_RPC_URL` con la raíz técnica del servidor. Para el servidor actual se detecta automáticamente `https://verdemex.somoslink.com.mx`.

El backend pagina las consultas y limita cada solicitud a 20,000 órdenes. Para volúmenes superiores, reduce el rango de fechas desde el dashboard.
