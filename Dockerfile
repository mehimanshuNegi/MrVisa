# Production Dockerfile for Render / Container Deployment
# Uses Ubuntu 24.04 (Noble Numbat) which ships with GLIBC 2.39,
# ensuring full native compatibility with @arcships/light-ocr (requires GLIBC >= 2.38).
FROM ubuntu:24.04

# Set non-interactive timezone/frontend
ENV DEBIAN_FRONTEND=noninteractive

# Install curl, certificates, and NodeSource repository for Node.js 22 LTS
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend package manifests
COPY backend/package.json ./

# Install production dependencies including native light-ocr binaries
RUN npm install --omit=dev

# Copy backend application source
COPY backend/ ./

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "src/server.js"]
