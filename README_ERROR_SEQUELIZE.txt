
=== Problema detectado en el proyecto "barber-server" ===

❌ ERROR: Foreign key constraint is incorrectly formed
Este error aparecía al ejecutar el proyecto con `npm run dev`, justo después de que Sequelize intentaba crear las tablas.

------------------------------------------------------------
🧠 Causa raíz del error:
------------------------------------------------------------
Sequelize ejecutaba múltiples `.sync()` en paralelo, uno por cada modelo.
Esto provocaba que algunas tablas con claves foráneas (como `barberos`, `clientes`, `compras`, etc.) se intentaran crear antes de que existiera la tabla de la que dependen (por ejemplo `usuarios`, `proveedores`, `servicios`).

Al no existir aún la tabla referenciada, MySQL rechazaba la creación de la tabla con el error:
`errno: 150 "Foreign key constraint is incorrectly formed"`

------------------------------------------------------------
✅ Solución aplicada:
------------------------------------------------------------
Se eliminó el uso de `.sync()` dentro de los modelos individuales.

En su lugar, se creó un archivo central llamado `src/syncAll.js` que:
- Importa todos los modelos
- Define todas las relaciones (`belongsTo`, `hasMany`, etc.)
- Ejecuta `sequelize.sync({ alter: true })` una sola vez, luego de cargar todas las relaciones

Este archivo es invocado desde el `Server` justo después de la conexión a la base de datos y antes de lanzar el `listen()`.

------------------------------------------------------------
📌 Recomendaciones para mantener el nuevo sistema
------------------------------------------------------------
1. Todas las relaciones entre modelos deben declararse exclusivamente en `syncAll.js`.
2. Ningún archivo de modelo debe ejecutar `.sync()` por sí solo.
3. Las relaciones deben ser bidireccionales si se desea hacer `include` en ambas direcciones (por ejemplo: `Usuario.hasMany(Cliente)` y `Cliente.belongsTo(Usuario)`).
4. Si se crea un nuevo modelo:
   - Se debe importar en `syncAll.js`
   - Se deben definir sus relaciones allí
5. No modificar el orden de sincronización sin asegurar que las tablas referenciadas estén definidas antes.

------------------------------------------------------------
📂 Archivo relevante:
- src/syncAll.js
- Se debe mantener actualizado con todos los modelos y relaciones del proyecto.
