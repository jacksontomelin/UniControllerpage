FROM node:22-alpine

WORKDIR /app

# better-sqlite3 pode precisar compilar
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./

# banco fica em volume persistente
ENV DB_DIR=/data
VOLUME ["/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "server.js"]
