FROM oven/bun AS build

WORKDIR /app

# Cache packages installation
COPY package.json package.json
COPY bun.lockb bun.lockb

RUN bun install

COPY ./src ./src

ENV NODE_ENV=production
ENV AUTH_SECRET={{environment.AUTH_SECRET}}
ENV TURSO_CONNECTION_URL={{environment.TURSO_CONNECTION_URL}}
ENV TURSO_AUTH_TOKEN={{environment.TURSO_AUTH_TOKEN}}

RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--target bun \
	--outfile server \
	./src/index.ts

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/server server
COPY ./drizzle ./drizzle
COPY ./drizzle.config.ts ./drizzle.config.ts

ENV NODE_ENV=production
ENV AUTH_SECRET={{environment.AUTH_SECRET}}
ENV TURSO_CONNECTION_URL={{environment.TURSO_CONNECTION_URL}}
ENV TURSO_AUTH_TOKEN={{environment.TURSO_AUTH_TOKEN}}

EXPOSE 3000

CMD ["./server"]
