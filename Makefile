NAME := fluxidea
CONTAINER_RUNTIME := docker
GIT_TAG := $(shell git describe --tags --abbrev=0 2> /dev/null || echo untagged)
VERSION ?= $(if $(filter v%,$(GIT_TAG)),$(patsubst v%,%,$(GIT_TAG)),untagged)
REGISTRY_HOST ?= ghcr.io
NAMESPACE ?= leebee-dev
IMG_WITHOUT_VER ?= ${REGISTRY_HOST}/${NAMESPACE}/${NAME}
IMAGE := ${IMG_WITHOUT_VER}:${VERSION}

BUILD_FLAGS = -X main.VERSION=${VERSION} -X main.COMMIT=$(shell git rev-parse --short=16 HEAD) -X main.BUILD_DATE=$(shell date -I)

.PHONY: run
run:
	@go run -ldflags="${BUILD_FLAGS}" cmd/main.go

.PHONY: image-build
image-build:
	${CONTAINER_RUNTIME} buildx build \
	--build-arg BUILD_FLAGS="${BUILD_FLAGS}" \
	--no-cache -t ${IMAGE} --platform linux/amd64,linux/arm64 .

.PHONY: release
release: image-build
	${CONTAINER_RUNTIME} tag ${IMAGE} ${IMG_WITHOUT_VER}:latest
	${CONTAINER_RUNTIME} push ${IMAGE}
	${CONTAINER_RUNTIME} push ${IMG_WITHOUT_VER}:latest

image-push: image-build
	${CONTAINER_RUNTIME} push ${IMAGE}

PORT ?= 8080
CONTAINER_PORT ?= 80
DATA_PATH ?= $(shell pwd)/data
.PHONY: image-run
image-run:
	${CONTAINER_RUNTIME} run --name ${NAME} -p ${PORT}:${CONTAINER_PORT} -v $(DATA_PATH):/app/data -d --rm ${IMAGE}
