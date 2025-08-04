# CORS Preflight Request Issue and Proxy Solution

## Problem Description

This React application encountered a CORS (Cross-Origin Resource Sharing) issue when attempting to make OAuth token requests to an external API endpoint. The problem manifested as incomplete CORS responses from the server when the browser automatically included the `Access-Control-Request-Method: POST` header in preflight requests.

## Root Cause Analysis

### Observation

The external OAuth server at `https://aqua.maxapex.net/apex/a244716b/oauth/token` responds differently depending on whether the preflight request includes the `Access-Control-Request-Method` header:

**Without `Access-Control-Request-Method` header (complete CORS response):**
```bash
curl 'https://aqua.maxapex.net/apex/a244716b/oauth/token' -X OPTIONS \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:138.0) Gecko/20100101 Firefox/138.0' \
  -H 'Accept: */*' \
  -H 'Accept-Language: en-US,en;q=0.5' \
  -H 'Accept-Encoding: gzip, deflate, br, zstd' \
  -H 'Access-Control-Request-Headers: authorization' \
  -H 'Referer: http://localhost:3000/' \
  -H 'Origin: http://localhost:3000' \
  -H 'Connection: keep-alive' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: cross-site' \
  -H 'Priority: u=4' \
  -H 'Pragma: no-cache' \
  -H 'Cache-Control: no-cache' -i
```

**Response:**
```
HTTP/1.1 200 
Date: Mon, 04 Aug 2025 18:43:00 GMT
Server: Apache
Allow: POST
Vary: Origin
Access-Control-Expose-Headers: Allow, Content-Length, Vary, Access-Control-Allow-Origin, Access-Control-Allow-Credentials
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Content-Length: 0
Keep-Alive: timeout=5, max=100
Connection: Keep-Alive
```

**With `Access-Control-Request-Method: POST` header (incomplete CORS response):**
```bash
curl 'https://aqua.maxapex.net/apex/a244716b/oauth/token' -X OPTIONS \
  -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:138.0) Gecko/20100101 Firefox/138.0' \
  -H 'Accept: */*' \
  -H 'Accept-Language: en-US,en;q=0.5' \
  -H 'Accept-Encoding: gzip, deflate, br, zstd' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization' \
  -H 'Referer: http://localhost:3000/' \
  -H 'Origin: http://localhost:3000' \
  -H 'Connection: keep-alive' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: cross-site' \
  -H 'Priority: u=4' \
  -H 'Pragma: no-cache' \
  -H 'Cache-Control: no-cache' -i
```

**Response:**
```
HTTP/1.1 200 
Date: Mon, 04 Aug 2025 18:43:21 GMT
Server: Apache
Content-Length: 0
Keep-Alive: timeout=5, max=100
Connection: Keep-Alive
```

### Browser Behavior

The browser automatically adds the `Access-Control-Request-Method` header during CORS preflight requests when any of the following conditions are met:

1. **HTTP method** other than GET, HEAD, or simple POST
2. **Custom headers** beyond simple headers (like `Authorization`)
3. **Content-Type** other than `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`

In our case, the `Authorization` header triggers the preflight request with the problematic `Access-Control-Request-Method: POST` header.

### Server Limitation

We cannot modify the external OAuth server's CORS implementation to properly handle requests that include the `Access-Control-Request-Method` header. The server appears to have a bug or misconfiguration that causes it to omit required CORS headers when this specific header is present.

## Solution: Proxy Server

To eliminate the CORS preflight request issue, we implemented a proxy server that:

1. **Eliminates Cross-Origin Requests**: The React app makes same-origin requests to our local proxy
2. **Handles Authentication Server-Side**: The proxy includes the Authorization header when making requests to the external API
3. **Avoids Preflight Triggers**: No custom headers or cross-origin requests from the browser

### Implementation

#### Dependencies Installed
```bash
npm install express cors http-proxy-middleware concurrently
```

- **express**: Web server framework for the proxy
- **cors**: CORS middleware to handle cross-origin requests from the React app
- **http-proxy-middleware**: Middleware for proxying requests (available for future use)
- **concurrently**: Utility to run both React and proxy servers simultaneously

#### Proxy Server (`proxy-server.js`)

The proxy server runs on port 3001 and provides an endpoint `/api/oauth/token` that:
- Accepts POST requests from the React app (same-origin, no CORS issues)
- Makes the actual OAuth request to the external API with proper credentials
- Returns the token response to the React app

#### Updated React Code

The `getToken()` function now makes requests to `http://localhost:3001/api/oauth/token` instead of the external API directly, eliminating all CORS complications.

#### NPM Scripts

Added convenient scripts to `package.json`:
- `npm run proxy`: Start only the proxy server
- `npm run dev`: Start both proxy and React servers concurrently

## Usage

### Development Mode (Recommended)
Start both servers together:
```bash
npm run dev
```

### Manual Mode
Start servers separately:
```bash
# Terminal 1 - Start proxy server
npm run proxy

# Terminal 2 - Start React app  
npm start
```
## Technical Flow

1. React app makes POST request to `localhost:3001/api/oauth/token` (same-origin)
2. No preflight request triggered (same-origin + standard headers)
3. Proxy server receives request and makes actual API call with Authorization header
4. External API responds normally (no CORS issues from server-to-server call)
5. Proxy returns response to React app

This solution completely bypasses the browser's CORS preflight mechanism while maintaining the same functionality from the application's perspective.
