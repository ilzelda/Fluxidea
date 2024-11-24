# Build stage
FROM golang:1.23 AS builder

WORKDIR /app

# Copy the source code
COPY . .

# Download all dependencies
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o mindlink -a cmd/main.go

# Final stage
FROM alpine:3.20

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/mindlink .
COPY --from=builder /app/static ./static

# Copy config file
COPY config/config.json .

# Expose port
EXPOSE 8080

# Set environment variable
ENV CONFIG_FILE_PATH=/app/config.json

# Run the application
CMD ["./mindlink"]
