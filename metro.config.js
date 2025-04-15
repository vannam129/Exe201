const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  server: {
    ...defaultConfig.server,
    // Thêm middleware để proxy API requests khi chạy trên web
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Proxy API requests khi chạy trên web
        if (req.url.startsWith('/api/')) {
          const targetUrl = 'https://balamaappwebapi-h8fmf5hjh7hcbsa0.southeastasia-01.azurewebsites.net' + req.url.replace('/api', '');
          console.log(`Proxying request to: ${targetUrl}`);
          
          // Xử lý request body
          let requestBody = '';
          req.on('data', chunk => {
            requestBody += chunk.toString();
          });
          
          req.on('end', () => {
            // Parse JSON body nếu có thể
            let parsedBody;
            if (requestBody && req.method !== 'GET') {
              try {
                parsedBody = JSON.parse(requestBody);
              } catch (e) {
                console.error('Failed to parse request body:', e);
              }
            }
            
            // Chuyển hướng request đến API server
            fetch(targetUrl, {
              method: req.method,
              headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://balamaappwebapi-h8fmf5hjh7hcbsa0.southeastasia-01.azurewebsites.net',
                // Sao chép các headers cần thiết từ request gốc
                ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
              },
              body: req.method !== 'GET' && parsedBody ? JSON.stringify(parsedBody) : undefined,
            })
            .then(apiRes => {
              // Sao chép status code
              res.statusCode = apiRes.status;
              
              // Sao chép headers cần thiết
              for (const [key, value] of apiRes.headers.entries()) {
                res.setHeader(key, value);
              }
              
              // Set CORS headers
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Request-With');
              
              return apiRes.text();
            })
            .then(data => {
              res.end(data);
            })
            .catch(error => {
              console.error('Proxy error:', error);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Proxy error' }));
            });
          });
          return;
        }
        
        // Xử lý OPTIONS request để hỗ trợ CORS preflight
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept, Authorization, X-Request-With');
          res.end();
          return;
        }
        
        // Xử lý các request khác như bình thường
        return middleware(req, res, next);
      };
    },
  },
}; 