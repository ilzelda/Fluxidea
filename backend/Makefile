NAME := mindlink

# Build the Go program
build:
	go build -o ./bin/${NAME} ./cmd/main.go

# Run the Go program
CONFIG := config.json
run:
	CONFIG_FILE_PATH=./config/${CONFIG} go run cmd/main.go

CONTAINER_RUNTIME := docker
IMAGE := mindlink.dev/mindlink:latest
# Build the Docker image
docker-build:
	${CONTAINER_RUNTIME} build -t ${IMAGE} .

PORT := 8080
CONTAINER_PORT := 8080
# Deploy the application (build Docker image and run)
deploy: docker-build
	${CONTAINER_RUNTIME} run --name ${NAME} -p ${PORT}:${CONTAINER_PORT} -d --rm ${IMAGE}

# Clean up built Go program
clean:
	rm -f ./bin/${NAME}

.PHONY: build run docker-build deploy clean
