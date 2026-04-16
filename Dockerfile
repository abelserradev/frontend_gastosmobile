# Angular 20.3+ exige Node >=20.19 o >=22.12; fijamos 22.12 para no depender de Nixpacks.
FROM node:22.12.0-alpine AS build

WORKDIR /app

# Si el orquestador inyecta NODE_ENV=production, npm omitiría devDependencies y fallaría ng build.
ENV NODE_ENV=development

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/web/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
