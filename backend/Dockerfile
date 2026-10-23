FROM node:18-alpine

RUN apk add --no-cache netcat-openbsd

WORKDIR /app

COPY package*.json ./
RUN npm install --force

COPY . .

RUN chmod +x start.sh && sed -i 's/\r$//' start.sh

# A broken TypeScript build must never produce a deployable image.
RUN npm run build

EXPOSE 3100

CMD ["sh", "./start.sh"]
