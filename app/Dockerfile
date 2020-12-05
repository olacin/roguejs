FROM zenika/alpine-chrome:with-node

WORKDIR /usr/src/app

COPY --chown=chrome src src
COPY --chown=chrome *.json ./

RUN npm install
RUN npm run lint && npm run tsc

CMD [ "node", "src/index.js" ]