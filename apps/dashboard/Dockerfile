FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/dashboard ./apps/dashboard
RUN npm ci --workspace=apps/dashboard
RUN npm run build --workspace=apps/dashboard
EXPOSE 3000
CMD ["npm", "start", "--workspace=apps/dashboard"]
