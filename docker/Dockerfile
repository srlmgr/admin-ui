# this file is used by goreleaser
ARG BUILDPLATFORM
FROM --platform=$BUILDPLATFORM nginx:alpine
COPY docker/dist/ /usr/share/nginx/html/
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
