# --- Etapa 1: build del sitio estático ---
FROM python:3.12-slim AS build

WORKDIR /docs

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY mkdocs.yml .
COPY docs/ ./docs/

RUN mkdocs build --strict --site-dir /site

# --- Etapa 2: servir el sitio estático con nginx ---
FROM nginx:1.27-alpine

COPY --from=build /site /usr/share/nginx/html

# Healthcheck simple para Docker Swarm
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

EXPOSE 80
