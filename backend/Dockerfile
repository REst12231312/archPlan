FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
RUN mkdir -p /var/lib/archplan
ENV NODE_ENV=production PORT=3000 ARCHPLAN_DB_PATH=/var/lib/archplan/archplan.sqlite
EXPOSE 3000
CMD ["npm", "start"]
