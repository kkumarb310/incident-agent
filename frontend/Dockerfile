FROM node:18-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENV REACT_APP_API_URL=http://localhost:8000

CMD ["npm", "start"]