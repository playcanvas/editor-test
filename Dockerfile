FROM mcr.microsoft.com/playwright:v1.53.2-noble AS base
WORKDIR /usr/src/test

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json package-lock.json /temp/dev/
RUN cd /temp/dev && npm ci

FROM base AS run
COPY --from=install /temp/dev/node_modules ./node_modules
COPY src ./src
COPY lib ./lib
COPY test ./test
COPY globals.d.ts ./
COPY playwright.config.mjs ./
COPY package.json package-lock.json ./
COPY tsconfig.json ./

ENV CI=true
CMD ["npm", "run", "test"]