// Local development uses a separate backend port. Deployment uses Nginx /api proxy.
window.CALCULATOR_CONFIG = {
  apiBaseUrl: ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname)
    && window.location.port === "8080"
    ? "http://127.0.0.1:8000"
    : "",
};
