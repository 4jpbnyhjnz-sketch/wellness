FROM node:24-slim

WORKDIR /app

COPY package*.json ./

ENTRYPOINT ["/bin/sh", "-c", "npm install ; npm run dev"]