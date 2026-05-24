.PHONY: help dev build test lint tidy clean

help:
	@echo "Cibles disponibles :"
	@echo "  make dev    — lance le serveur en local (go run)"
	@echo "  make build  — compile le binaire dans bin/server"
	@echo "  make test   — exécute tous les tests"
	@echo "  make lint   — golangci-lint en mode strict"
	@echo "  make tidy   — go mod tidy"
	@echo "  make clean  — supprime bin/ et coverage"

dev:
	go run ./cmd/server

build:
	mkdir -p bin
	go build -o bin/server ./cmd/server

test:
	go test ./... -race -count=1

lint:
	golangci-lint run ./...

tidy:
	go mod tidy

clean:
	rm -rf bin/ coverage.out coverage.html
