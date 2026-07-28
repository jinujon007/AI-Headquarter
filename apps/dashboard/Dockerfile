FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
# Workspace manifests + shared packages must be present so the root lockfile
# validates under `npm ci`, and so the postinstall step can build the
# @aihq/* packages the dashboard imports (@aihq/types).
COPY apps/server/package.json ./apps/server/package.json
COPY packages ./packages
COPY apps/dashboard ./apps/dashboard
RUN npm ci --workspace=apps/dashboard --workspace=packages/types --workspace=packages/core --workspace=packages/adapters
# Build-time placeholders only (ARG does not persist into the runtime image) —
# mirrors what CI sets for `next build`. Real values come from runtime env.
ARG ADMIN_PASSWORD=build-placeholder
ARG AUTH_SECRET=build-placeholder-32-char-secret-xx
RUN npm run build --workspace=apps/dashboard
EXPOSE 3000
CMD ["npm", "start", "--workspace=apps/dashboard"]
