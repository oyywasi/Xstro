FROM node:23-alpine
RUN apk add --no-cache git python3 py3-pip build-base cairo-dev jpeg-dev pango-dev giflib-dev
RUN ln -sf python3 /usr/bin/python
WORKDIR /app
RUN git https://github.com/oyywasi/Xstro
COPY package*.json ./
RUN npm install --production
EXPOSE 8080
CMD ["npm", "start"]
