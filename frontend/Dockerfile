FROM node:22-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ARG VITE_API_BASE_URL=/api
ARG VITE_PUBLIC_URL=https://example.com
ARG VITE_FREE_SHIPPING_THRESHOLD=500000
ARG VITE_FLAT_SHIPPING_COST=30000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_PUBLIC_URL=${VITE_PUBLIC_URL} \
    VITE_FREE_SHIPPING_THRESHOLD=${VITE_FREE_SHIPPING_THRESHOLD} \
    VITE_FLAT_SHIPPING_COST=${VITE_FLAT_SHIPPING_COST}

RUN npm run build

FROM nginx:1.29-alpine

COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/

EXPOSE 80
