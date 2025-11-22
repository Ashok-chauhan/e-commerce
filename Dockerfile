FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

# Copy entire project
COPY . .

# Expose your app port
EXPOSE 3000

# Start app
CMD ["node", "app.js"]
