const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy regular API calls to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api',
      },
    })
  );

  // Proxy WebSocket connections to backend
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'ws://localhost:5000',
      ws: true,
      changeOrigin: true,
      pathRewrite: {
        '^/ws': '/ws',
      },
    })
  );
};
