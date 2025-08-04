# Problema de Solicitud Preliminar CORS y Solución de Proxy

## Descripción del Problema

Esta aplicación React encontró un problema de CORS (Intercambio de Recursos de Origen Cruzado) al intentar realizar solicitudes de token OAuth a un endpoint de API externo. El problema se manifestó como respuestas CORS incompletas del servidor cuando el navegador incluía automáticamente el encabezado `Access-Control-Request-Method: POST` en las solicitudes preliminares.

## Análisis de la Causa Raíz

### Observación

El servidor OAuth externo en `https://aqua.maxapex.net/apex/a244716b/oauth/token` responde de manera diferente dependiendo de si la solicitud preliminar incluye el encabezado `Access-Control-Request-Method`:

**Sin el encabezado `Access-Control-Request-Method` (respuesta CORS completa):**
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

**Respuesta:**
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

**Con el encabezado `Access-Control-Request-Method: POST` (respuesta CORS incompleta):**
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

**Respuesta:**
```
HTTP/1.1 200 
Date: Mon, 04 Aug 2025 18:43:21 GMT
Server: Apache
Content-Length: 0
Keep-Alive: timeout=5, max=100
Connection: Keep-Alive
```

### Comportamiento del Navegador

El navegador agrega automáticamente el encabezado `Access-Control-Request-Method` durante las solicitudes preliminares de CORS cuando se cumple alguna de las siguientes condiciones:

1. **Método HTTP** diferente de GET, HEAD o POST simple
2. **Encabezados personalizados** más allá de los encabezados simples (como `Authorization`)
3. **Content-Type** diferente de `application/x-www-form-urlencoded`, `multipart/form-data` o `text/plain`

En nuestro caso, el encabezado `Authorization` activa la solicitud preliminar con el problemático encabezado `Access-Control-Request-Method: POST`.

### Limitación del Servidor

No podemos modificar la implementación de CORS del servidor OAuth externo para manejar adecuadamente las solicitudes que incluyen el encabezado `Access-Control-Request-Method`. El servidor parece tener un error o una mala configuración que provoca que omita los encabezados CORS requeridos cuando este encabezado específico está presente.

## Solución: Servidor Proxy

Para eliminar el problema de la solicitud preliminar CORS, implementamos un servidor proxy que:

1. **Elimina Solicitudes de Origen Cruzado**: La aplicación React realiza solicitudes de mismo origen a nuestro proxy local.
2. **Maneja la Autenticación del Lado del Servidor**: El proxy incluye el encabezado de autorización al realizar solicitudes a la API externa.
3. **Evita Activadores de Solicitudes Preliminares**: No hay encabezados personalizados ni solicitudes de origen cruzado desde el navegador.

### Implementación

#### Dependencias Instaladas
```bash
npm install express cors http-proxy-middleware concurrently
```

- **express**: Framework de servidor web para el proxy.
- **cors**: Middleware CORS para manejar solicitudes de origen cruzado desde la aplicación React.
- **http-proxy-middleware**: Middleware para proxy de solicitudes (disponible para uso futuro).
- **concurrently**: Utilidad para ejecutar simultáneamente los servidores de React y proxy.

#### Servidor Proxy (`proxy-server.js`)

El servidor proxy se ejecuta en el puerto 3001 y proporciona un endpoint `/api/oauth/token` que:
- Acepta solicitudes POST de la aplicación React (mismo origen, sin problemas de CORS).
- Realiza la solicitud OAuth real a la API externa con las credenciales adecuadas.
- Devuelve la respuesta del token a la aplicación React.

#### Código React Actualizado

La función `getToken()` ahora realiza solicitudes a `http://localhost:3001/api/oauth/token` en lugar de a la API externa directamente, eliminando todas las complicaciones de CORS.

#### Scripts de NPM

Se añadieron scripts convenientes a `package.json`:
- `npm run proxy`: Iniciar solo el servidor proxy.
- `npm run dev`: Iniciar simultáneamente los servidores de proxy y React.

## Uso

### Modo de Desarrollo (Recomendado)
Iniciar ambos servidores juntos:
```bash
npm run dev
```

### Modo Manual
Iniciar los servidores por separado:
```bash
# Terminal 1 - Iniciar servidor proxy
npm run proxy

# Terminal 2 - Iniciar aplicación React  
npm start
```

## Flujo Técnico

1. La aplicación React realiza una solicitud POST a `localhost:3001/api/oauth/token` (mismo origen).
2. No se activa la solicitud preliminar (mismo origen + encabezados estándar).
3. El servidor proxy recibe la solicitud y realiza la llamada a la API real con el encabezado de autorización.
4. La API externa responde normalmente (sin problemas de CORS en la llamada de servidor a servidor).
5. El proxy devuelve la respuesta a la aplicación React.

Esta solución elude completamente el mecanismo de solicitud preliminar CORS del navegador mientras mantiene la misma funcionalidad desde la perspectiva de la aplicación.