FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# HUSKY=0: no git hooks inside the image.
RUN HUSKY=0 npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.mjs reads these while building: the /api/v1 rewrite to the backend is fixed in the
# build output, so the backend address is a build argument, not a runtime setting.
ARG API_URL=http://api:8080
ARG SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_ENV=production
ARG NEXT_PUBLIC_COOKIE_DOMAIN=
ENV API_URL=$API_URL \
    SITE_URL=$SITE_URL \
    NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV \
    NEXT_PUBLIC_COOKIE_DOMAIN=$NEXT_PUBLIC_COOKIE_DOMAIN \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["node", "server.js"]
