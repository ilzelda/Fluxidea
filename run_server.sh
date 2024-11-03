#!/bin/sh

CONTAINER_NAME=mindlink
IMAGE=mindlink.dev/mindlink:latest
PORT=8080
CONTAINER_PORT=8080
CONTAINER_RUNTIME=docker

cp -r frontend/ backend/static/

${CONTAINER_RUNTIME} build -t ${IMAGE} backend/

${CONTAINER_RUNTIME} run --name ${CONTAINER_NAME} -p ${PORT}:${CONTAINER_PORT} -d --rm ${IMAGE}