FROM node:20-alpine

WORKDIR /app

# Install dependencies, openssl for Prisma, and Redis
RUN apk add --no-cache openssl redis
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy all source
COPY . .

# Build TypeScript
RUN npm i -D typescript @types/node @types/express
RUN npx tsc --outDir dist

EXPOSE 4000

# Start redis in the background, run migrations, seed, and start
CMD sh -c "redis-server --daemonize yes && npx prisma db push --skip-generate && node dist/prisma/seed.js && node dist/src/index.js"
