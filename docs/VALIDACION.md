# Validacion tecnica de la version 1
GitHub, porqu
Este documento registra las validaciones locales y las ejecuciones remotas realizadas en GitHub Actions. La implementación fue verificada mediante pruebas automatizadas, análisis de seguridad Snyk y despliegue simulado, con evidencias enlazadas al final del documento.

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
| Analisis Snyk | Aprobado en GitHub Actions: Snyk Code y Container ejecutados correctamente |
| GitHub Actions | Aprobado: pipeline completo, despliegue simulado y evidencias generadas |

## Respuestas observadas en el despliegue local

```json
{"status":"ok","service":"catalogo","version":"1.0.0"}
{"status":"ok","service":"inventario","version":"1.0.0"}
{"product":{"id":1,"name":"Cuaderno","category":"papeleria","price":2500},"inventory":{"productId":1,"stock":12,"available":true}}
```

Los contenedores temporales se retiraron con `docker compose down --volumes --remove-orphans` despues de completar la revision.


## Validacion remota en GitHub Actions

### Pipeline principal

- Repositorio: https://github.com/cristpinog/ep2-devops
- Commit: `10e3fbb`
- Ejecucion: https://github.com/cristpinog/ep2-devops/actions/runs/41367083777
- Resultado: exitoso.
- Pruebas, cobertura, construccion Docker, Snyk y despliegue simulado aprobados.
- Se generaron dos artefactos de trazabilidad.

### Validacion de Pull Requests

- Pull Request #5: https://github.com/cristpinog/ep2-devops/pull/5
- Ejecucion: https://github.com/cristpinog/ep2-devops/actions/runs/41371569623
- Resultado: exitoso.
- Aprobaron las pruebas, Dependency Review, construccion Docker, Snyk y despliegue simulado.

### Proteccion de la rama principal

Se configuro una regla de proteccion para `main` que exige Pull Requests y seis verificaciones exitosas antes de fusionar cambios.

Configuracion: https://github.com/cristpinog/ep2-devops/settings/branches

### Correccion de seguridad aplicada

Se retiro npm global de las imagenes finales de catalogo e inventario, evitando incorporar las dependencias vulnerables detectadas inicialmente por Snyk. Las imagenes corregidas superaron posteriormente el analisis autenticado en GitHub Actions.
