# Makefile

.PHONY: build start stop restart logs clean deemwar browser-restart bash goto


GOOGLE_URL="https://www.google.com"
GITHUB_URL="https://github.com"
CONTAINER_NAME=browser-automation-api

bash:
	docker-compose exec $(CONTAINER_NAME) bash

#make goto url=https://www.example.com
goto:
ifndef url
	@echo "Error: URL parameter is missing. Usage: make goto url=https://example.com"
	@exit 1
endif
	curl -X POST -H "Content-Type: application/json" \
		-d '{"url":"$(url)"}' \
		http://localhost:3000/api/goto
execute-script:
ifndef script
	@echo "Error: script parameter is missing. Usage: make execute-script script='document.title'"
	@exit 1
endif
	curl -X POST -H "Content-Type: application/json" \
	-d '{"script":"$(script)"}' \
	http://localhost:3000/api/execute

# Start continuous script execution
# Usage: make execute-continuous script="setInterval(() => window.sendResult({scroll: window.scrollY}), 1000)"
execute-continuous:
ifndef script
	@echo "Error: script parameter is missing. Usage: make execute-continuous script='your_script_here'"
	@exit 1
endif
	curl -X POST -H "Content-Type: application/json" \
	-d '{"script":"$(script)", "continuous":true}' \
	http://localhost:3000/api/execute

# Stop a continuous script
# Usage: make stop-script id=script_123456
stop-script:
ifndef id
	@echo "Error: id parameter is missing. Usage: make stop-script id=script_123456"
	@exit 1
endif
	curl -X POST -H "Content-Type: application/json" \
	-d '{"scriptId":"$(id)"}' \
	http://localhost:3000/api/execute/stop

# Test Google search
deemwar:
	curl -X POST -H "Content-Type: application/json" \
		-d '{"url":"https://www.deemwar.com"}' \
		http://localhost:3000/api/goto

# Test Google search
show-browser:
	curl -X GET http://localhost:3000/api/browser/show

hide-browser:
	curl -X GET http://localhost:3000/api/browser/hide

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
