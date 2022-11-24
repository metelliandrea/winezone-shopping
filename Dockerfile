FROM node:18.2.0

RUN mkdir -p /usr/src/app
COPY ./src /usr/src/app/src
COPY ./package.json /usr/src/app/package.json
COPY ./tsconfig.json /usr/src/app/tsconfig.json
COPY ./nest-cli.json /usr/src/app/nest-cli.json
COPY ./yarn.lock /usr/src/app/yarn.lock
WORKDIR /usr/src/app/
RUN yarn
RUN yarn build
RUN rm -rf ./src

# Setting up ENVs
ENV NODE_ENV=development\
  PORT=3002\
  LOGGER_LEVEL=debug\
  LOGTAIL_TOKEN=J8p4WmRK37xKvH6DYLzsfckc\
  DATABASE_HOST=127.0.0.1\
  DATABASE_NAME=products\
  DATABASE_USER=root\
  DATABASE_PASSWORD=root\
  REDIS_HOST=localhost\
  REDIS_PASSWORD=root\
  REDIS_PORT=6379\
  EMPTY_CART_SYMBOL=EMPTY_CART\
  RABBITMQ_HOSTNAME=localhost\
  RABBITMQ_PORT=5672\
  RABBITMQ_USERNAME=root\
  RABBITMQ_PASSWORD=root\
  RABBITMQ_CART_QUEUE_NAME=cart_queue\
  RABBITMQ_PRODUCTS_QUEUE_NAME=products_queue\
  ADD_PRODUCTS_TO_STOCK_SYMBOL=ADD_TO_STOCK\
  REMOVE_PRODUCTS_FROM_STOCK_SYMBOL=REMOVE_FROM_STOCK\
  AXIOS_BASE_TIMEOUT=3000\
  AUTH_SERVICE_INTERNAL_URL=localhost\
  AUTH_SERVICE_INTERNAL_PORT=3001

# Seeting up start command
CMD ["yarn", "start", "prod"]