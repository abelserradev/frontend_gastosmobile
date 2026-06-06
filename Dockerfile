# Angular 20.3+ exige Node >=20.19 o >=22.12; pnpm 11.3+ exige Node >=22.13.
FROM node:22.14.0-alpine AS build

WORKDIR /app

# Si el orquestador inyecta NODE_ENV=production, pnpm omitiría devDependencies y fallaría ng build.
ENV NODE_ENV=development

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

# La API key web de Firebase no debe ir en el repo; Coolify/build debe pasar build-arg o env en tiempo de build.
ARG FIREBASE_WEB_API_KEY
ENV FIREBASE_WEB_API_KEY=${FIREBASE_WEB_API_KEY}
ARG GASTOS_API_KEY
ENV GASTOS_API_KEY=${GASTOS_API_KEY}

RUN pnpm run build

FROM nginx:1.27-alpine

COPY nginx.default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/web/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
