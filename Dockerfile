FROM ghcr.io/onecx/docker-spa-base:2.6.0

# Copy nginx configuration
COPY nginx/locations.conf $DIR_LOCATION/locations.conf
# Copy application build
COPY dist/ $DIR_HTML

# Optional extend list of application environments
#ENV CONFIG_ENV_LIST BFF_URL,APP_BASE_HREF

# Application environments default values
ENV APP_BASE_HREF /mfe/service-auth
ENV BFF_URL http://onecx-service-auth-bff:8080/