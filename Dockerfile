FROM oven/bun AS build

WORKDIR /app

# Cache packages installation
COPY package.json package.json
COPY bun.lockb bun.lockb

RUN bun install

COPY ./src ./src

ENV NODE_ENV=production
ENV AUTH_SECRET=your_secret
ENV DB_FILE_NAME=db.sqlite

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
ENV AUTH_SECRET=your_secret
ENV DB_FILE_NAME=db.sqlite

EXPOSE 3000

CMD ["./server"]
