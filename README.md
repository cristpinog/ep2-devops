# Evaluacion Parcial 2 - Ingenieria DevOps (DOY0101)

Version 1 del encargo **"Anadiendole complejidad a nuestro pipeline"**, construida sobre el microservicio de catalogo de EP1. El repositorio contiene dos microservicios Node.js, pruebas automatizadas, imagenes Docker multi-stage, controles DevSecOps, despliegue efimero y orquestacion con Docker Compose.

## Estado de la solucion

| Componente | Implementacion |
|---|---|
| Catalogo | API conservada y ampliada con consulta de disponibilidad |
| Inventario | Segundo microservicio con consulta, filtro y reserva de stock |
| Pruebas | 22 casos con `node:test` y umbral minimo de cobertura de 80% |
| Contenedores | Dos Dockerfiles multi-stage sobre `node:24-alpine`, usuario no root |
| Seguridad | Dependabot, `npm audit`, Dependency Review y Snyk para dependencias, codigo e imagenes |
| Orquestacion | Compose con red privada, healthchecks, dependencia saludable y limites de recursos |
| Despliegue | Entorno efimero en GitHub Actions con smoke tests y artefactos trazables |

## Arquitectura

```text
Cliente
  |
  v
Catalogo :3000  ---- HTTP ---->  Inventario :3001
  |                                  |
  +-- productos                      +-- stock y reservas
```

Los datos son de demostracion y se mantienen en memoria. Cada reinicio restaura su estado inicial.

## API

### Catalogo (`http://localhost:3000`)

| Metodo | Ruta | Resultado |
|---|---|---|
| GET | `/health` | Estado y version del servicio |
| GET | `/products` | Lista completa |
| GET | `/products?category=papeleria` | Filtro por categoria |
| GET | `/products/:id` | Producto por identificador |
| GET | `/products/:id/availability` | Producto unido con el stock obtenido desde inventario |

### Inventario (`http://localhost:3001`)

| Metodo | Ruta | Resultado |
|---|---|---|
| GET | `/health` | Estado y version del servicio |
| GET | `/inventory` | Lista completa de existencias |
| GET | `/inventory?available=true` | Elementos filtrados por disponibilidad |
| GET | `/inventory/:productId` | Stock de un producto |
| POST | `/inventory/:productId/reserve` | Reserva una cantidad enviada como `{ "quantity": 1 }` |

## Ejecucion local con Docker Compose

Requisitos: Docker Engine con Docker Compose v2. Para ejecutar pruebas fuera de Docker se requiere Node.js 24 o superior; Docker y GitHub Actions tambien usan Node.js 24.

```bash
docker compose config --quiet
docker compose up --build --wait
```

Comprobaciones:

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3000/products/1/availability
```

Retiro del entorno:

```bash
docker compose down --volumes --remove-orphans
```

Los puertos se pueden cambiar sin editar el archivo:

```bash
CATALOG_PORT=8080 INVENTORY_PORT=8081 docker compose up --build --wait
```

En PowerShell se establecen con `$env:CATALOG_PORT` y `$env:INVENTORY_PORT`.

## Pruebas automatizadas

Cada servicio usa el ejecutor nativo de Node.js 24. JaCoCo no se incluye porque corresponde a proyectos Java; en este proyecto Node.js la cobertura se obtiene con `--experimental-test-coverage`. Los `package.json` declaran `node >=24`, en concordancia con los Dockerfiles y el workflow.

```bash
cd services/catalog
npm ci
npm run check
npm run test:coverage

cd ../inventory
npm ci
npm run check
npm run test:coverage
```

El comando falla si lineas, funciones o ramas quedan bajo 80%. Los Dockerfiles vuelven a ejecutar sintaxis, pruebas y cobertura durante la etapa `test`, por lo que una imagen final no se construye si esos controles fallan.

## Pipeline CI/CD

El workflow [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) se activa en `push` y `pull_request` para `main` y `develop`, ademas de ejecución manual.

1. **Pruebas y cobertura:** matriz para catalogo e inventario, sintaxis, 22 pruebas, cobertura y `npm audit`.
2. **Revision de dependencias:** bloquea en pull requests dependencias nuevas con severidad alta o critica.
3. **Construccion Docker:** crea una sola vez las dos imagenes etiquetadas con el SHA, registra sus IDs y publica un archivo comprimido con checksum SHA-256.
4. **Seguridad Snyk:** descarga y verifica ese artefacto; bloquea ante vulnerabilidades altas en dependencias, codigo o las mismas imagenes construidas.
5. **Despliegue simulado:** vuelve a verificar checksum e IDs, carga las imagenes aprobadas sin reconstruirlas, levanta Compose, espera ambos healthchecks y publica metadatos y logs.

Los trabajos de construccion, seguridad y despliegue no usan `continue-on-error`. Una falla detiene las etapas dependientes.

Snyk se instala desde el lockfile con version `1.1308.3` y se ejecuta mediante `npx --no-install`, evitando que npm sustituya silenciosamente el paquete fijado. Los microservicios actualmente no tienen dependencias externas: la politica `scripts/snyk-open-source.sh` omite Snyk Open Source solo cuando el conteo comprobado es cero. Si se agrega cualquier dependencia, `snyk test` se activa automaticamente y sigue siendo bloqueante. Snyk Code y Snyk Container siempre se ejecutan.

## Seguridad y recursos

- Dependabot revisa npm, Docker y GitHub Actions semanalmente.
- Snyk analiza SCA, SAST y las dos imagenes con umbral `high`.
- Los servicios corren como el usuario `node`, con filesystem de solo lectura, todas las capabilities eliminadas y `no-new-privileges`.
- Cada contenedor queda limitado a 0,50 CPU, 128 MiB de RAM y 100 procesos.
- Los cuerpos JSON aceptados por inventario tienen un limite de 1 KiB.
- Los healthchecks controlan disponibilidad real; `depends_on` espera a que inventario este saludable.
- Los lockfiles fijan las versiones resueltas y `npm ci` evita instalaciones no reproducibles.

## Configuracion obligatoria en GitHub

Antes de ejecutar el pipeline remoto:

1. Crear una cuenta/proyecto en Snyk para el repositorio.
2. Guardar el token en **Settings > Secrets and variables > Actions > New repository secret** con nombre exacto `SNYK_TOKEN`.
3. Si Dependabot debe ejecutar el mismo analisis en sus pull requests, agregar el mismo nombre en **Dependabot secrets**.
4. En **Settings > Branches**, proteger `main` y exigir los checks `Pruebas y cobertura`, `Construccion Docker`, `Seguridad bloqueante Snyk` y `Despliegue simulado y smoke tests`.
5. Habilitar **Dependency graph**, **Dependabot alerts** y **Dependabot security updates** en **Settings > Security**.

La ausencia de `SNYK_TOKEN` produce una falla explicita. No hay tokens incluidos en el repositorio.

## Trazabilidad y evidencias

- Cada ejecucion queda asociada a `github.sha`, `github.ref`, `run_id` y `run_attempt`.
- Las imagenes usan el SHA del commit como etiqueta durante el pipeline.
- El artefacto `docker-images-<sha>` conserva las dos imagenes, checksum SHA-256, SHA del commit e IDs de imagen.
- Los jobs de seguridad y despliegue descargan ese artefacto; el despliegue compara los IDs cargados con los IDs generados en build.
- El artefacto `simulated-deployment-<sha>` conserva metadatos, estado de contenedores, logs y respuesta de integracion durante 30 dias.
- La matriz completa requisito-archivo-evidencia esta en [`docs/TRAZABILIDAD.md`](docs/TRAZABILIDAD.md).
- La validacion ejecutada para esta version esta en [`docs/VALIDACION.md`](docs/VALIDACION.md).
- La auditoria previa a publicacion esta en [`docs/AUDITORIA_FINAL.md`](docs/AUDITORIA_FINAL.md).

## Relacion con la pauta

| Indicador | Evidencia principal |
|---|---|
| IE1 Contenedores | Dos Dockerfiles multi-stage, imagen Alpine, usuario no root, build en CI |
| IE2 Pruebas | 22 pruebas, cobertura minima y ejecucion en matriz |
| IE3 Seguridad/escalabilidad | Dependabot, Snyk bloqueante, Dependency Review, limites y hardening |
| IE4 Despliegue/trazabilidad | Despliegue efimero, smoke tests, SHA y artefactos |
| IE5 Orquestacion | Compose, red, healthchecks, dependencia saludable y reinicio |

## Uso de inteligencia artificial

Se utilizo **OpenAI ChatGPT/Codex** como apoyo para generar una primera version del codigo, pruebas, configuracion de contenedores, pipeline y documentacion. El equipo debe revisar y validar el contenido antes de entregarlo. Esta declaracion no reemplaza las reflexiones, conclusiones ni justificaciones tecnicas personales exigidas por la pauta.

Referencia sugerida para declarar la herramienta, ajustable al formato solicitado por el docente:

> OpenAI. (2026). *ChatGPT/Codex* [Modelo de inteligencia artificial]. https://chatgpt.com/

Guia institucional: [Uso de IA - Bibliotecas Duoc UC](https://bibliotecas.duoc.cl/ia).

## Trabajo reservado a los estudiantes

La pauta exige que cada integrante redacte sin IA su reflexion personal, conclusiones y justificaciones tecnicas. Esas secciones no estan redactadas en este repositorio. La lista de acciones externas y espacios pendientes esta en [`docs/PENDIENTES_ESTUDIANTE.md`](docs/PENDIENTES_ESTUDIANTE.md).
