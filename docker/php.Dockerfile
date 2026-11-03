FROM php:8.2-cli

RUN docker-php-ext-install pdo_mysql

WORKDIR /app

COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
