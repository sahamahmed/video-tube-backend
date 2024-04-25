FROM node:alpine
WORKDIR /usr/src/app
COPY ./package.json ./
COPY ./package-lock.json ./
RUN npm install 
COPY ./src ./src
COPY ./.env ./
CMD ["npm", "start"] 
