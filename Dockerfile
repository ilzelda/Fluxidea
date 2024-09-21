# Build stage
FROM golang:1.20-alpine AS builder

WORKDIR /app

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download all dependencies
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# Final stage
FROM alpine:3.14

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/main .

# Copy config file
COPY config.json .

# Expose port
EXPOSE 8080

# Set environment variable
ENV CONFIG_FILE_PATH=/app/config.json

# Run the application
CMD ["./main"]
