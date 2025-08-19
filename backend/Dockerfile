FROM node:16

# Install dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
  gconf-service \
  libasound2 \
  libatk1.0-0 \
  libcairo2 \
  libcups2 \
  libfontconfig1 \
  libgdk-pixbuf2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libpango-1.0-0 \
  libxss1 \
  fonts-liberation \
  libappindicator1 \
  libnss3 \
  lsb-release \
  xdg-utils \
  wget \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD [ "node", "src/server.js" ]