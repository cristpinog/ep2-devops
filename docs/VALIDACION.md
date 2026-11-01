# Validacion tecnica de la version 1

Este documento se completa con resultados reproducibles de la revision local. No sustituye la ejecucion del workflow en GitHub, porque Snyk y los artefactos remotos requieren el secreto y el repositorio configurado.

## Entorno usado

- Fecha: 1 de noviembre de 2026 (America/Santiago)
- Node.js: 24.20.0
- npm: 11.19.0
- Docker: 29.9.1
- Docker Compose: 5.6.0

## Matriz de validacion

| Verificacion | Resultado |
|---|---|
| Lockfiles y auditoria npm | Aprobado; 0 vulnerabilidades en ambos servicios y tooling |
| Sintaxis catalogo | Aprobado con `npm run check` |
| Pruebas y cobertura catalogo | 11/11; lineas 91,46%, ramas 87,50%, funciones 85,71% |
| Sintaxis inventario | Aprobado con `npm run check` |
| Pruebas y cobertura inventario | 11/11; lineas 92,86%, ramas 87,80%, funciones 90,00% |
| Validez de Compose | Aprobado con `docker compose config --quiet` |
| Sintaxis GitHub Actions | Aprobada con Actionlint, sin errores ni advertencias |
| Script Snyk Open Source | Aprobado con ShellCheck, sin errores ni advertencias |
| Compatibilidad Node.js | Requisito unificado en Node.js >=24; Docker, CI y pruebas locales usan la misma version mayor |
| Trazabilidad entre jobs | Workflow transfiere un artefacto Docker unico con checksum e IDs; despliegue usa `--no-build` |
| Build multi-stage catalogo | Aprobado; la etapa de build ejecuto las 11 pruebas y umbrales |
| Build multi-stage inventario | Aprobado; la etapa de build ejecuto las 11 pruebas y umbrales |
| Healthchecks | Catalogo e inventario reportaron `healthy` |
| Integracion | `GET /products/1/availability` unio producto 1 con stock 12 |
| Usuario de contenedores | Confirmado `uid=1000(node)` en ambos servicios |
| Hardening efectivo | Confirmados rootfs de solo lectura, `CapDrop=ALL` y `no-new-privileges` |
| Limites efectivos | Confirmados 128 MiB RAM, 0,50 CPU y 100 procesos por contenedor |
| Snyk CLI | Version fijada 1.1308.3 instalada y ejecutable |
| Instalacion limpia Snyk | Aprobada en contenedor Linux efimero con `npm ci --ignore-scripts` y `npx --no-install snyk --version` |
| Snyk Open Source sin dependencias | Politica aprobada: valida manifiesto y lockfile, informa grafo vacio y activa `snyk test` automaticamente si aparecen dependencias |
| Analisis Snyk | No ejecutado: requiere `SNYK_TOKEN` y proyecto Snyk del estudiante |
| GitHub Actions | No ejecutado: requiere publicar los cambios y configurar el secreto |

## Respuestas observadas en el despliegue local

```json
{"status":"ok","service":"catalogo","version":"1.0.0"}
{"status":"ok","service":"inventario","version":"1.0.0"}
{"product":{"id":1,"name":"Cuaderno","category":"papeleria","price":2500},"inventory":{"productId":1,"stock":12,"available":true}}
```

Los contenedores temporales se retiraron con `docker compose down --volumes --remove-orphans` despues de completar la revision.
