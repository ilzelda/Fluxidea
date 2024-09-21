# Build the Go program
build:
	go build -o ./bin/static-server ./cmd/main.go

# Run the Go program
run:
	CONFIG_FILE_PATH=./config/dev.config.json go run ./cmd/main.go

# Build the Docker image
docker-build:
	docker build -t static-server .

# Deploy the application (build Docker image and run Go program)
deploy: docker-build run

# Clean up built Go program
clean:
	rm -f static-server

.PHONY: build run docker-build deploy clean
