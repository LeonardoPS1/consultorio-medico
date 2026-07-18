# AicoreMed Docs — scaffold de documentación técnica

Sitio de documentación (MkDocs Material) para el proyecto `consultorio-medico` / AicoreMed.

## Cómo integrarlo a tu repo

1. Copia toda esta carpeta como `docs-site/` dentro de `consultorio-medico/`
   (nombre distinto a tu carpeta `docs/` actual para no pisarla — este scaffold ya
   incluye una copia de tus `docs/*.md` existentes reorganizada bajo `docs-site/docs/existente/`).
2. Revisa que el contenido copiado en `docs-site/docs/existente/` sea idéntico al de tu
   `docs/` original — si prefieres no duplicar, puedes hacer que `docs-site/docs/existente/`
   sea symlinks a tu `docs/` real, o mover los archivos definitivamente y actualizar
   referencias en el README principal del repo.
3. Agrega el job `.github/workflows/docs.yml` a tu CI (o intégralo al `ci.yml` existente).
4. Agrega el servicio de `docker-compose.docs.yml` a tu stack de producción, ajustando
   red y labels de Traefik a como ya los tienes configurados para el dashboard.
5. Actualiza el DNS: `docs.aicorebots.com` → tu VPS (mismo patrón que usas para
   `med.aicorebots.com`).

## Desarrollo local

```bash
cd docs-site
make install
make serve   # http://localhost:8000, recarga en vivo
```

## Build de producción

```bash
make docker-build
make docker-run   # http://localhost:8080
```

## Qué falta completar (contenido, no infraestructura)

- [ ] Rellenar los 6 stubs en `docs/modulos/` con el detalle real de cada feature.
- [ ] Conectar `docs/api/reference.md` al spec OpenAPI real una vez completado el
      Sprint 2 del roadmap (generación desde los schemas Zod).
- [ ] Agregar nuevos ADRs en `docs/decisiones/` a medida que se tomen decisiones técnicas
      no triviales (usar `plantilla.md` como base).
