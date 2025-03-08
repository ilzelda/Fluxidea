# Build stage
FROM --platform=$BUILDPLATFORM golang:1.23 AS builder

ARG BUILD_FLAGS

WORKDIR /app

COPY . .

RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -ldflags="${BUILD_FLAGS}" -o server -a cmd/main.go

# Final stage
FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/server ./app
COPY --from=builder /app/static ./static

COPY --from=builder /app/config/config.prod.json ./config/config.json
COPY --from=builder /app/config/prod.env ./config/.env

EXPOSE 80
EXPOSE 443

CMD ["./app"]
