# WEB SECURITY LAB

**Una presentación que es también un laboratorio interactivo de seguridad web.**

20 temas de la investigación, divididos en cinco grupos. Una página por tema, con explicación corta, interruptor **Vulnerable / Protegido**, botón **Cargar ejemplo**, botón **Ejecutar prueba**, resultado y código comparativo desplegable. Navegación con flechas **← / →** o índice (`I`). Diseñado para una exposición de 10–15 minutos.

## Estructura del repositorio

```text
web-security-lab/
├── public/                    # Frontend publicado por Cloudflare Pages
│   ├── index.html             # Portada, índice, escenario y navegación
│   ├── _headers               # Cabeceras reales para archivos estáticos
│   ├── css/styles.css         # Diseño académico y responsive
│   └── js/
│       ├── app.js             # Motor único para las 20 diapositivas
│       └── data.js            # Investigación, ejemplos y códigos de los 20 temas
├── functions/api/            # Backend Cloudflare Pages Functions
│   ├── lab.js                # SQLi, IDOR, hash PBKDF2, limitación de peticiones
│   ├── headers.js            # Respuesta con cabeceras HTTP REALES
│   └── xss-frame.js          # XSS aislado dentro de iframe sandbox
├── db/schema.sql             # Tablas D1 y datos ficticios
├── tests/                    # Pruebas básicas de seguridad y contenido
├── wrangler.toml             # Configuración de Cloudflare y enlace D1
├── package.json
└── README.md
```

## Requisitos

- Node.js 20 o posterior.
- Acceso a Internet una vez para `npm install`.
- Cuenta de Cloudflare para desplegar; para ensayar en local no hace falta publicar.

## Cómo ejecutar TODO en tu computadora

```bash
npm install
npm run db:local
npm run dev
```

Abre **http://localhost:8788**. Las funciones y la base D1 corren con Wrangler local. El comando `db:local` crea datos totalmente ficticios en el almacenamiento local; no afecta ninguna base de datos remota.

Si ves un error al inicializar D1, confirma que el binding `LAB_DB` existe en `wrangler.toml` y que se ejecutó `npm run db:local` antes de `npm run dev`.

Si no hay Internet durante la exposición, sirve el directorio `public` con un servidor HTTP local (por ejemplo `python -m http.server 8000 -d public`): **las 14 simulaciones y la navegación funcionan**, pero los seis laboratorios que dependen del backend no serán auténticos. Para ejecutar las prácticas reales sin Internet se necesita haber instalado Wrangler y preparado D1 local previamente.

## Publicarlo desde un repositorio en Cloudflare Pages (recomendado)

1. Sube **todos los archivos y carpetas del proyecto** a GitHub. No subas `node_modules`, `.wrangler` o secretos. **No subas solamente `public`**, porque Pages necesita la carpeta `functions` para generar el backend.
2. En Cloudflare crea una **base D1** llamada `web-security-lab` (`npx wrangler login` y después `npx wrangler d1 create web-security-lab`). Copia el `database_id` devuelto y reemplaza el UUID `00000000-0000-0000-0000-000000000000` en `wrangler.toml`.
3. Crea las tablas en D1 remota con `npm run db:remote`. Son datos **100% ficticios**.
4. En el panel de Cloudflare, elige **Workers & Pages → Create → Pages → Connect to Git**, vincula tu repositorio y configura:
   - **Production branch:** `main`
   - **Build command:** `exit 0`
   - **Build output directory:** `public`
   - **Root directory:** raíz del repositorio
5. Verifica en **Settings → Bindings** que exista el binding **D1 = `LAB_DB`**, conectado a la base `web-security-lab`. Si lo agregas o modificas, vuelve a desplegar.
6. Abre el enlace `*.pages.dev` y comprueba `/api/headers` y las pruebas en modo protegido.

> **Importante:** Cloudflare recomienda `exit 0` para proyectos HTML estáticos con Pages Functions. Si usas la opción de subir archivos arrastrándolos al panel, Cloudflare no compila la carpeta `functions`; por eso debes conectar el repositorio o desplegar con Wrangler.

### Publicación alternativa usando Wrangler

Después de crear la base D1 y el proyecto Pages:

```bash
npx wrangler pages project create web-security-lab
npm run deploy
```

Si la integración por Git ya administra ese proyecto, mantén ese método de publicación; no necesitas hacerlo de las dos formas.

## Personalizar la portada

En `public/js/app.js`, cambia el valor de `TEAM_NAMES` por los nombres de ambos expositores. Si quieres cambiar las explicaciones o los ejemplos, están centralizados en `public/js/data.js`.

## Reparto entre dos integrantes

| Frontend | Backend |
|---|---|
| `public/index.html` | `functions/api/lab.js` |
| `public/css/styles.css` | `functions/api/xss-frame.js` |
| `public/js/app.js` | `functions/api/headers.js` |
| `public/js/data.js` | `db/schema.sql` y pruebas D1 |

Trabajen en ramas `frontend` y `backend` y reúnan los cambios en `main`. La comunicación usa `fetch('/api/lab')`, `fetch('/api/headers')` y el iframe `/api/xss-frame`.

## Qué es real y qué es una simulación

| Tema | Modo vulnerable | Modo protegido |
|---|---|---|
| XSS | Ejecuta HTML/JS **solo en localhost**, dentro de iframe aislado | Escape de HTML real en servidor (local o nube) |
| SQL Injection | Consulta concatenada real **solo en localhost** con base ficticia | Consulta parametrizada real contra D1 |
| Hash / salt | Muestra una contraseña ficticia en texto plano, **sin almacenarla** | Hash PBKDF2 real con salts aleatorios |
| Cabeceras HTTP | Escenario sin cabeceras **simulado** | Cabeceras HTTP reales de Pages Functions |
| IDOR | Consulta sin comprobación de propietario **solo en localhost**, con facturas ficticias | Filtro por ID y propietario en D1 |
| Rate limiting | Falta de límites **simulada** (no se genera tráfico masivo) | Contador y respuesta HTTP 429 reales en D1 |
| Otros 14 | Simulación interactiva sin peticiones maliciosas | Simulación de controles y consecuencias |

### Restricciones y honestidad técnica

- **Nunca se expone un endpoint SQL o IDOR deliberadamente vulnerable al sitio público.** `LAB_MODE=local` **y** hostname `localhost/127.0.0.1` son condiciones necesarias para los ejemplos locales. No agregues `LAB_MODE=local` en Cloudflare.
- La tabla `demo_users` incluye **PIN y códigos ficticios**, no contraseñas auténticas. En un sistema real no se guardarían contraseñas en texto claro.
- **PBKDF2 es real**, pero **no es bcrypt ni Argon2id**. Para un sistema moderno de contraseñas se prefiere Argon2id cuando esté disponible. Esta elección evita sumar paquetes criptográficos al despliegue educativo.
- El laboratorio IDOR muestra **control de propiedad**, pero el actor `ana/luis` es seleccionado en pantalla; no implementa autenticación real. No uses este patrón como autenticación de producción.
- El rate limiting es **didáctico, por identificador de demostración** que el cliente podría cambiar; no reemplaza un limitador robusto por IP, identidad y reglas antifraude. Requiere D1.
- Las cabeceras se ven realmente en `/api/headers`; el modo vulnerable es una comparación simulada. HSTS solo tiene sentido bajo HTTPS.
- El laboratorio XSS usa un iframe **sin `allow-same-origin`** y sin permisos de conexión; no ejecutes payloads fuera del marco aislado.
- El laboratorio SSRF **no descarga URLs**, Command Injection **no ejecuta órdenes**, DoS/DDoS **no envía tráfico masivo**, y Upload **no guarda archivos**.

## Guion de exposición sugerido (10-15 minutos)

- Portada y principios: 1 minuto.
- 6 laboratorios principales (XSS, SQLi, hashes, headers, IDOR y rate limiting): 1 a 1,5 minutos cada uno.
- 14 simulaciones: recorrer rápidamente y seleccionar 3–4 de mayor interés (2–3 minutos en total). Los demás se dejan explorables por el profesor en el enlace publicado.
- Conclusiones: 30 segundos.

Si intentan hacer las 20 demos completas con explicación y código en 15 minutos, necesitarían menos de 45 segundos por tema: difícil en la práctica. Por eso **todos los temas están implementados**, pero no hace falta ejecutar todos en vivo durante la clase.

## Comprobaciones antes de exponer

```bash
npm test
```

Haz además estas pruebas manuales:

1. En localhost, SQL Injection con usuario `admin` y PIN `' OR '1'='1' -- ` debe devolver **registros ficticios** en vulnerable; protegido debe negar el acceso.
2. En localhost, IDOR con actor `ana` y factura `202` debe mostrar la factura ficticia de Luis en vulnerable; protegido debe denegar.
3. XSS local debe alterar el texto **solo dentro del iframe** en modo vulnerable; en protegido debe verse la etiqueta literal.
4. Hash protegido debe mostrar dos hashes distintos del mismo texto.
5. `/api/headers` debe responder con CSP, `nosniff`, `Referrer-Policy` y otras cabeceras (verifica en Network).
6. Rate limiting debe responder HTTP 429 después de más de cuatro intentos por ventana de 30 segundos (espera 30 segundos para repetir).
7. Abre la página sin Internet y comprueba el índice, flechas y las 14 simulaciones.
8. En la URL pública repite SQLi/IDOR en modo vulnerable: **debe decir SIMULACIÓN**, nunca revelar datos de D1 mediante código inseguro.

## Fuentes de investigación

El contenido sigue la investigación académica aportada por el equipo sobre los 20 temas, con referencias técnicas a OWASP Top 10:2025, OWASP Cheat Sheet Series, MDN, INCIBE y documentación de Cloudflare. Se incluyen fragmentos de código ilustrativos; el resultado de una simulación no demuestra la presencia ni ausencia de una vulnerabilidad real.

- [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare Pages D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/#d1-databases)
- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/configuration/headers/)
