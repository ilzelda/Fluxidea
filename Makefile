NAME := mindlink

.PHONY: build
build:
	go build -o ./bin/${NAME} ./cmd/main.go

CONFIG := config.json
.PHONY: run
run:
	CONFIG_FILE_PATH=./config/${CONFIG} go run cmd/main.go

CONTAINER_RUNTIME := docker
GIT_TAG := $(shell git describe --tags --abbrev=0 2> /dev/null || echo untagged)
VERSION ?= $(shell if [[ "$(GIT_TAG)" =~ ^v[0-9]+\.[0-9]+\.[0-9]+.*$$ ]]; then echo $(GIT_TAG) | sed -e 's/v\(.*\)/\1/g'; else echo 'untagged'; fi)
REGISTRY_HOST ?= docker.io
IMAGE := ${REGISTRY_HOST}/leebee725/mindlink:${VERSION}
.PHONY: image-build
image-build:
	${CONTAINER_RUNTIME} buildx build --no-cache -t ${IMAGE} --platform linux/amd64,linux/arm64 .

.PHONY: release
release: image-build
	${CONTAINER_RUNTIME} tag ${IMAGE} ${REGISTRY_HOST}/leebee725/mindlink:latest
	${CONTAINER_RUNTIME} push ${IMAGE}
	${CONTAINER_RUNTIME} push ${REGISTRY_HOST}/leebee725/mindlink:latest

image-push: image-build
	${CONTAINER_RUNTIME} push ${IMAGE}

PORT ?= 8080
CONTAINER_PORT ?= 8080
DATA_PATH ?= data
.PHONY: image-run
image-run:
	${CONTAINER_RUNTIME} run --name ${NAME} -p ${PORT}:${CONTAINER_PORT} -v $(DATA_PATH):/app/data -d --rm ${IMAGE}

.PHONY: clean
clean:
	rm -f ./bin/${NAME}
