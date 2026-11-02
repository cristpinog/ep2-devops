# Auditoria final de la version 1

Fecha de ejecucion: 1 de noviembre de 2026, America/Santiago.

## Correcciones aplicadas

| Hallazgo | Correccion |
|---|---|
| `.github` no aparecia en el ZIP anterior | El nuevo empaquetado incluye y verifica expresamente `.github/workflows/ci-cd.yml` y `.github/dependabot.yml` |
| Los servicios declaraban Node.js >=22, pero los scripts se validaron con Node.js 24 | `engines.node` se actualizo a `>=24`, igual que Docker y GitHub Actions |
| Cada job reconstruia sus propias imagenes | `docker-build` construye una vez y publica ambas imagenes en `docker-images-<sha>` |
| Seguridad y despliegue no comprobaban identidad del artefacto | Ambos verifican SHA-256; despliegue compara los IDs cargados con los IDs registrados por build |
| Compose reconstruia durante el despliegue | El job usa `docker compose up --no-build`, por lo que despliega exactamente las imagenes aprobadas |
| `npx snyk` podia resolver otro paquete si faltaba el binario local | Todos los comandos usan `npx --no-install snyk`; el workflow compara la version instalada y reportada con `1.1308.3` |
| `snyk test --file` podia fallar en manifiestos sin dependencias | Una politica valida manifiesto y lockfile, cuenta cuatro grupos de dependencias y omite solo los grafos realmente vacios |
| El token estaba disponible para todo el job | `SNYK_TOKEN` se limita a los pasos que lo verifican o consumen |

## Archivos obligatorios

- `.github/workflows/ci-cd.yml`: presente y validado con Actionlint.
- `.github/dependabot.yml`: presente, con ecosistemas npm, Docker y GitHub Actions.
- `services/catalog/Dockerfile`: presente y funcional.
- `services/inventory/Dockerfile`: presente y funcional.
- `compose.yaml`: presente y validado.

## Resultados locales

| Control | Resultado |
|---|---|
| Pruebas catalogo | 11/11 aprobadas |
| Cobertura catalogo | Lineas 91,46%; ramas 87,50%; funciones 85,71% |
| Pruebas inventario | 11/11 aprobadas |
| Cobertura inventario | Lineas 92,86%; ramas 87,80%; funciones 90,00% |
| Auditorias npm | 0 vulnerabilidades en catalogo, inventario y tooling |
| Docker multi-stage | Ambos builds aprobados; las pruebas se ejecutaron dentro del build |
| Actionlint | Sin errores ni advertencias |
| ShellCheck | `scripts/snyk-open-source.sh` sin errores ni advertencias |
| Instalacion limpia de Snyk | En `node:24-alpine`, `npm ci --ignore-scripts` seguido de `npx --no-install snyk --version` devolvio `1.1308.3` |
| Integridad del binario Snyk | El wrapper fijado descargo el binario Linux oficial y comprobo que los checksums esperado y real eran identicos |
| Politica Snyk Open Source | Catalogo e inventario detectados correctamente con cero dependencias externas; ambos emitieron aviso y no invocaron un analisis sin grafo |
| Reconstruccion final | Ambas imagenes reconstruidas sin cache; las 22 pruebas y umbrales aprobaron dentro de Docker |
| Despliegue final | Ambos servicios `healthy` y smoke test integrado aprobado |
| Docker Compose | Configuracion valida; ambos servicios `healthy` |
| Integracion | Catalogo obtuvo producto 1 y stock 12 desde inventario |
| Usuario | `uid=1000(node)` en ambos contenedores |
| Seguridad efectiva | `privileged=false`, rootfs de solo lectura, `CapDrop=ALL`, `no-new-privileges=true` |
| Recursos efectivos | 128 MiB RAM, 0,50 CPU y 100 procesos por contenedor |

## Prueba de transferencia de imagenes

La simulacion local construyo una sola vez, archivo ambas imagenes, calculo el checksum, volvio a cargarlas y desplego con `--no-build`.

```text
artifact_sha256=85F0FE44B5297CC8BDD4C81D518E624F2E9005562B6AAD8B0C796A63548E90CC
catalog_image_id=sha256:6be998692fd7cefdbd682feaac0d25333c177c53792325280252970cf6b6f539
inventory_image_id=sha256:9fc7757adfa42384c5228a2c19c441e7740d19d1aa9304fdb79985b72b25f14a
```

Los IDs observados dentro de los contenedores desplegados fueron identicos a los IDs anteriores.

## Dependencias entre trabajos

```text
quality
  -> docker-build
       -> security-snyk
            -> deploy-simulated

dependency-review (control independiente y obligatorio para pull requests)
```

- `docker-build` solo comienza si termina `quality`.
- `security-snyk` solo comienza si termina `docker-build` y consume su artefacto.
- `deploy-simulated` solo comienza si terminan `docker-build` y `security-snyk`.
- Ningun control bloqueante utiliza `continue-on-error`.
- `dependency-review` se ejecuta solamente en pull requests y debe configurarse como check obligatorio de la rama.

## Pendientes al finalizar la auditoría local (histórico)

No fue posible ejecutar localmente estos controles externos:

1. Analisis autenticado de Snyk para dependencias, codigo e imagenes: requiere `SNYK_TOKEN`, cuenta y Snyk Code habilitado.
2. Ejecucion real de GitHub Actions: requiere publicar el codigo en el repositorio elegido.
3. Dependency Review y Dependabot: requieren Dependency graph y funciones de seguridad habilitadas en GitHub.
4. Proteccion de `main`: requiere configuracion administrativa del repositorio.
5. Reflexiones, conclusiones y justificaciones tecnicas personales: deben ser redactadas por los estudiantes sin IA.

No se realizo push ni se modifico el repositorio remoto EP1.


## Actualización posterior a la publicación

La evaluación fue publicada en GitHub y se completaron las verificaciones remotas que estaban pendientes durante la auditoría local.

| Control | Resultado | Evidencia |
|---|---|---|
| Pipeline principal | Aprobado | https://github.com/cristpinog/ep2-devops/actions/runs/41367083777 |
| Snyk Code y Container | Aprobados en CI | Ejecución principal |
| Pruebas y construcción Docker | Aprobadas | Ejecución principal |
| Despliegue simulado | Aprobado | Ejecución principal |
| Dependency Review | Aprobado en PR #5 | https://github.com/cristpinog/ep2-devops/actions/runs/41371569623 |
| Protección de main | Regla creada con seis checks obligatorios | Configuración del repositorio |

### Corrección posterior a la auditoría local

Snyk detectó vulnerabilidades de severidad alta y crítica en las dependencias de npm global incluidas en las imágenes base. Se modificaron ambos Dockerfiles para retirar npm y npx de la etapa final de ejecución, conservándolos en las etapas necesarias para instalar y probar los servicios.

La corrección quedó publicada en el commit `10e3fbb`. Los análisis de seguridad y el despliegue simulado aprobaron posteriormente.

### Pendientes de entrega académica

- Revisar la documentación y completar los datos académicos correspondientes.
- Incorporar las reflexiones, conclusiones y justificaciones personales exigidas por la pauta, redactadas por los estudiantes.
- Entregar el enlace del repositorio mediante AVA y correo al docente.
