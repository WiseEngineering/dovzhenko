FROM node:16-alpine

WORKDIR /app

COPY package-lock.json .
COPY package.json .

RUN npm i

COPY . .

EXPOSE 3300

CMD [ "npm", "run", "start" ]