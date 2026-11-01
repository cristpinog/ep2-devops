ARG NODE_IMAGE=node:24-alpine
FROM ${NODE_IMAGE} AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY src ./src
COPY test ./test
RUN npm run check && npm run test:coverage

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=test --chown=node:node /app/src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
