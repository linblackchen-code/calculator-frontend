FROM nginx:stable-alpine
COPY index.html styles.css app.js theme.js config.js /usr/share/nginx/html/
COPY config.production.js /usr/share/nginx/html/config.js
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
