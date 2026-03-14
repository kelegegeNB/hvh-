FROM node:20-bullseye-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
RUN npm run db:generate
RUN npm run build
EXPOSE 3001
CMD ["npm","run","start"]
