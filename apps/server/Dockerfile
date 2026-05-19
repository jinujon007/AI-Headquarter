FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/server ./apps/server
COPY packages ./packages
COPY tsconfig.base.json ./
RUN npm ci --workspace=apps/server --workspace=packages/core --workspace=packages/adapters --workspace=packages/types
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/core
RUN npm run build --workspace=packages/adapters
RUN npm run build --workspace=apps/server
EXPOSE 3001
CMD ["npm", "start", "--workspace=apps/server"]
