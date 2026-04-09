FROM node:24-alpine AS build

RUN corepack enable pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM node:24-alpine

WORKDIR /app
COPY --from=build /app/dist/server.mjs ./server.mjs

USER node
EXPOSE 7890

CMD ["node", "server.mjs"]
