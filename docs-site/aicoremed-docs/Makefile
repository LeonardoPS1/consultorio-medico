.PHONY: install serve build build-strict docker-build docker-run

install:
	pip install -r requirements.txt

# Sirve en local con recarga en vivo — http://localhost:8000
serve:
	mkdocs serve -a 0.0.0.0:8000

# Build de producción a ./site
build:
	mkdocs build

# Igual que build, pero falla si hay links rotos o warnings — usar en CI
build-strict:
	mkdocs build --strict

docker-build:
	docker build -t aicoremed-docs:latest .

docker-run:
	docker run --rm -p 8080:80 aicoremed-docs:latest
