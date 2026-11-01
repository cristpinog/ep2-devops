# Matriz de trazabilidad

Esta matriz relaciona cada indicador con su implementacion verificable y con la evidencia esperada.

| Indicador | Implementacion | Control automatico | Evidencia |
|---|---|---|---|
| IE1 | `services/catalog/Dockerfile` y `services/inventory/Dockerfile` | Jobs `quality` y `docker-build`; pruebas dentro de la etapa Docker `test` | Artefacto `docker-images-<sha>` con imagenes, checksum, SHA e IDs |
| IE2 | Pruebas `node:test` de ambos servicios; umbral 80% | Matriz `quality`; `npm run test:coverage` | Log del job por servicio |
| IE3 | Dependabot, Dependency Review, npm audit y Snyk; usuario no root, capabilities eliminadas y limites | Umbral `high` con salida distinta de cero; trabajos sin tolerancia de error | Logs `dependency-review` y `security-snyk` |
| IE4 | Compose efimero ejecutado desde Actions; etiquetas con SHA | Build publica imagenes; seguridad y despliegue verifican checksum; despliegue compara IDs y usa `--no-build` | Artefactos de imagenes y despliegue, `run_id`, SHA, IDs, logs y respuesta integrada |
| IE5 | `compose.yaml`, red `backend`, healthchecks y `depends_on: condition: service_healthy` | `docker compose up --wait` y tres smoke tests | `compose-ps.txt`, `compose-logs.txt`, `integration-response.json` |

## Cadena de promocion

```text
commit/PR
  -> sintaxis + pruebas + cobertura + npm audit
  -> build unico de ambas imagenes + checksum + IDs
  -> transferencia del artefacto a Snyk
  -> Snyk dependencias + codigo + las mismas imagenes
  -> transferencia y verificacion de IDs
  -> Docker Compose efimero sin reconstruccion
  -> healthchecks + smoke test integrado
  -> artefactos asociados al SHA
```

Una etapa dependiente no comienza si falla la anterior. El despliegue solo ocurre tras aprobar calidad, construccion y Snyk.

## Politicas de calidad codificadas

| Politica | Umbral/comportamiento |
|---|---|
| Cobertura | Lineas, funciones y ramas >= 80% por servicio |
| Dependencias npm | Falla con vulnerabilidades `high` o `critical` |
| Dependency Review | Falla si un PR agrega dependencias con severidad `high` o superior |
| Snyk | Falla en dependencias, codigo o imagenes desde severidad `high` |
| Salud | Cada servicio debe responder HTTP 2xx antes de validar integracion |
| Recursos | 0,50 CPU, 128 MiB RAM y 100 procesos por servicio |

## Evidencia remota que debe conservarse

Para la entrega final, enlazar o capturar desde GitHub:

1. Ejecucion completa en verde del workflow `CI/CD EP2`.
2. Detalle de la matriz de pruebas para ambos servicios.
3. Resultado de Snyk sin vulnerabilidades bloqueantes.
4. Artefactos `docker-images-<sha>` y `simulated-deployment-<sha>`.
5. Pull request de Dependabot o pantalla que confirme su configuracion.
6. Reglas de proteccion de `main` con los checks obligatorios.
