FROM node:16-alpine

WORKDIR /app

COPY package-lock.json .
COPY package.json .

RUN npm i

COPY . .

RUN npm run build

EXPOSE 3300

CMD node ./dist/main.js