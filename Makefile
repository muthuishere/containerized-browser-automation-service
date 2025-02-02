# Makefile

.PHONY: build start stop restart logs clean deemwar browser-restart bash


GOOGLE_URL="https://www.google.com"
GITHUB_URL="https://github.com"
CONTAINER_NAME=browser-automation-api

bash:
	docker-compose exec $(CONTAINER_NAME) bash


# Test Google search
deemwar:
	curl -X POST -H "Content-Type: application/json" \
		-d '{"url":"https://www.deemwar.com"}' \
		http://localhost:3000/api/goto



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

browser-restart:
	@echo "Restarting browser..."
	curl -X POST -H "Content-Type: application/json" \
		-d '{}' \
		http://localhost:3000/browser/restart
	@echo "\nBrowser restart completed"


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
