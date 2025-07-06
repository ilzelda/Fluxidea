# Build stage
FROM golang:1.23-alpine AS builder

ARG BUILD_FLAGS

WORKDIR /app

COPY . .

RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags="${BUILD_FLAGS}" -o server -a cmd/main.go

# Final stage
FROM alpine:3.21

ARG TYPE

WORKDIR /app

COPY --from=builder /app/server ./app
COPY --from=builder /app/static ./static

COPY --from=builder /app/config/${TYPE}/config.json ./config/config.json
COPY --from=builder /app/config/${TYPE}/.env ./config/.env

EXPOSE 80
EXPOSE 443

CMD ["./app"]
