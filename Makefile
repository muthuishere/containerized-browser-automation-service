# Makefile

.PHONY: build start stop restart logs clean test-google test-github


GOOGLE_URL="https://www.google.com"
GITHUB_URL="https://github.com"

# Test Google search
test-google:
	@echo "Testing Google search automation..."
	curl -X POST -H "Content-Type: application/json" \
		-d '{"url":"$(GOOGLE_URL)"}' \
		http://localhost:3000/goto
	@sleep 2
	curl -X POST -H "Content-Type: application/json" \
		-d '{"selector":"input[name=q]","text":"puppeteer automation"}' \
		http://localhost:3000/type
	@sleep 1
	curl -X POST -H "Content-Type: application/json" \
		-d '{"selector":"input[name=q]"}' \
		http://localhost:3000/click
	@echo "Google search test completed"

# Test GitHub navigation
test-github:
	@echo "Testing GitHub navigation..."
	curl -X POST -H "Content-Type: application/json" \
		-d '{"url":"$(GITHUB_URL)"}' \
		http://localhost:3000/goto
	@sleep 2
	curl -X POST -H "Content-Type: application/json" \
		-d '{"selector":"input[name=q]"}' \
		http://localhost:3000/click
	@sleep 1
	curl -X POST -H "Content-Type: application/json" \
		-d '{"selector":"input[name=q]","text":"puppeteer"}' \
		http://localhost:3000/type
	@echo "GitHub navigation test completed"

# Default target
all: build start

# Build the Docker image
reload:stop
	docker-compose up --build

# Start the containers
start:
	docker-compose up


# Stop the containers
stop:
	docker-compose down
	@echo " container stopped"

# Restart the containers
restart: stop start

# View container logs
logs:
	docker-compose logs -f

# Clean up everything (including volumes)
clean:
	docker-compose down -v
	docker rmi ubuntu-chrome-rustdesk
	@echo "Cleaned up containers, images, and volumes"

# Show container status
status:
	docker-compose ps

# Show help
help:
	@echo "Available commands:"
	@echo "  make build    - Build the Docker image"
	@echo "  make start    - Start the containers"
	@echo "  make stop     - Stop the containers"
	@echo "  make restart  - Restart the containers"
	@echo "  make logs     - View container logs"
	@echo "  make clean    - Clean up everything"
	@echo "  make status   - Show container status"
