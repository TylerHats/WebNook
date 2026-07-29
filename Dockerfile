# Stage 1: Build Frontend & Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package descriptors
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm run setup

# Copy source files
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build frontend and backend
RUN npm run build

# Stage 2: Runtime image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Install git for in-container self-updating
RUN apk add --no-cache git

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Copy git repository metadata for self-updater
COPY .git ./.git

# Install setup dependencies so in-container git pull and npm run build can compile TypeScript & Vite assets
RUN npm run setup

# Copy compiled dist files
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

# Create persistent storage directories
RUN mkdir -p /app/backend/data /app/backend/uploads

EXPOSE 4000

CMD ["node", "backend/dist/server.js"]
