FROM node:22-alpine as builder
WORKDIR /home/node

COPY --chown=node:node . build

RUN apk add -U --no-cache --virtual .build-deps git sudo \
  && sudo -u node sh -c 'cd build && npm i --ignore-scripts && npm run build && rm -rf node_modules' \
  && sudo -u node sh -c 'cp -r build/dist/* build/package.json build/package-lock.json .' \
  && sudo -u node sh -c 'npm i --ignore-scripts --production'

FROM node:22-alpine
CMD ["/usr/local/bin/node", "index.js"]
WORKDIR /home/node
USER node

COPY --from=builder /home/node/build/dist/ .
COPY --from=builder /home/node/node_modules/@natlibfi/melinda-ui-commons/src shared
COPY --from=builder /home/node/node_modules node_modules
COPY --from=builder /home/node/package.json .
COPY --from=builder /home/node/package-lock.json .

ENV SHARED_PARTIALS_LOCATION='/shared/views/partials/'
ENV SHARED_PUBLIC_LOCATION='/shared/'
ENV SHARED_VIEWS_LOCATION='/shared/views'