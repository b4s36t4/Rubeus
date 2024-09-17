# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install

COPY ./ ./

RUN npm run build \
&& rm -rf node_modules \
&& npm install --production

# Bundle app source
COPY . .

# ENV variables
ENV SOURCE_SYNC_API_BASEPATH="https://api.portkey.ai/v1/sync"
ENV CONTROL_PLANE_BASEPATH="https://api.portkey.ai/v1"
ENV ALBUS_BASEPATH="https://albus.portkey.ai"
ENV PROMETHEUS_GATEWAY_URL="https://prom-gateway-portkey.gravitycloud.tech"
ENV PROMETHEUS_GATEWAY_AUTH="cG9ydGtleTpDJlJlOTduTWojRXBINXBO"
ENV LOKI_HOST="https://loki-portkey.gravitycloud.tech"
ENV LOKI_AUTH="portkey:C&Re97nMj#EpH5pN"
ENV NODE_ENV="production"
ENV PORT=${PORT:-8787}

# Expose the port your app runs on
EXPOSE ${PORT}

ENTRYPOINT ["npm"]

# Define the command to run your app
CMD ["run", "start:node"]