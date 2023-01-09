FROM node:16

ENV NODE_ENV=production

# RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

# Create app directory
WORKDIR /app


COPY ["package.json", "package-lock.json*", "./"]

# USER node

RUN npm install --production
# If you are building your code for production
# RUN npm ci --only=production

# COPY --chown=node:node . .

# Bundle app source
COPY . .

# EXPOSE 8080
CMD [ "node", "index.js" ]