# Build stage
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Copy modules manifests
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /zombie-backend .

# Run stage
FROM alpine:latest

WORKDIR /

COPY --from=builder /zombie-backend /zombie-backend

EXPOSE 8080

CMD ["/zombie-backend"]
