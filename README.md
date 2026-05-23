# admin-ui

Administration frontend

## gRPC Transport Format Configuration

The frontend uses ConnectRPC and supports two wire formats:

- binary (protobuf)
- json

### Default Behavior

1. Production default is binary.
2. Development default is json.

### Development Configuration (.env.development)

Set the following variable:

- VITE_GRPC_USE_BINARY=false to use json
- VITE_GRPC_USE_BINARY=true to use binary
- VITE_CURRENT_USER_POLL_SECONDS=60 to refresh /currentuser every 60 seconds after successful login bootstrap

Current development default in `.env.development` is json (`VITE_GRPC_USE_BINARY=false`).

### Runtime Production Configuration (public/config.json)

Set the following key in runtime config:

- grpcUseBinary: true for binary
- grpcUseBinary: false for json

### Precedence

1. In development, Vite env var VITE_GRPC_USE_BINARY is used.
2. In production, runtime public/config.json value grpcUseBinary is used.
3. If not provided, safe fallback defaults apply:
    - development fallback: json
    - production fallback: binary
