# syntax=docker/dockerfile:1

# ── Build ────────────────────────────────────────────────────────────────────
# PUBLIC_REWIND_URL is read in the browser, so Astro inlines it at build time.
# It is the one setting that has to be known here rather than at `docker run`.
FROM node:24-alpine AS build

ARG PUBLIC_REWIND_URL=""
ARG SITE_URL="https://racecast.example.com"
ENV PUBLIC_REWIND_URL=$PUBLIC_REWIND_URL \
    SITE_URL=$SITE_URL

WORKDIR /app
RUN corepack enable

# Dependencies first, so editing source does not re-resolve the lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build && pnpm prune --prod


# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:24-alpine AS runtime

WORKDIR /app

# NODE_OPTIONS silences the ExperimentalWarning node:sqlite prints on import.
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    DATABASE_PATH=/data/racecast.db \
    NODE_OPTIONS=--no-warnings=ExperimentalWarning

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

# The database lives on a volume; the app creates the file on first start.
RUN mkdir -p /data && chown -R node:node /data
VOLUME /data

USER node
EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server/entry.mjs"]
