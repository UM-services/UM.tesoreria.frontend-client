# TODOS

## Shared API

### Pasar los lectores de `detail` sueltos a `mensajeDeError`

**What:** Migrar las 11 pantallas que leen `err.error.detail` cada una a su manera al helper `mensajeDeError` de `@tesoreria/shared-api`.

**Why:** Que un solo lugar decida cómo se lee un error del backend (`detail` y, si no viene, `message`), así todas las pantallas muestran los mensajes igual.

**Context:** El helper nace con #93 (Gastos), que lo usa junto con Proveedores. Archivos a migrar: `libs/feature-permisos` (permisos, catalogo, roles), `libs/feature-administrador` (autoridades-presupuesto, asignacion-usuarios, usuarios, cotizaciones-minimas, autorizantes-envio) y `libs/feature-pedido-compra` (pedido-form, pedido-detalle, pedido-presupuesto). Algunas arman textos propios («Error al …: detail.») que hay que conservar. Empezar por `libs/feature-administrador/src/lib/usuarios/usuarios.ts:416`.

**Effort:** M
**Priority:** P3
**Depends on:** que se mergee el PR de #93.

## Completed
