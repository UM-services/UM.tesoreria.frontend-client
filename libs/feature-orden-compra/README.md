# @tesoreria/feature-orden-compra

Módulo de Órdenes de Compra para el sistema de tesorería.

### Componentes
- **OcDashboardComponent** - Listado de OC con simulación de roles y filtros
- **OcCreateComponent** - Formulario multi-paso de creación de OC
- **OcDetailComponent** - Detalle de OC con historial tipo chat y acciones (aprobar, enviar, anular)

### Rutas
- `/orden-compra` - Dashboard
- `/orden-compra/nueva` - Crear nueva OC
- `/orden-compra/oc/:id` - Detalle de OC

### Flujo de Aprobación
La aprobación depende del monto total y el rol simulado:
- ≤ $50k → Director de Administración
- $50k-$200k → Secretario Administrativo o Director de Gestión
- > $200k → Rector
