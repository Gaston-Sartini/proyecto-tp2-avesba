# Guía del backend de AvesBA (Node + Express)

Esta guía explica **cómo funciona el backend por dentro**: qué hay en cada carpeta, para qué sirve cada archivo y cómo viaja un pedido de un archivo a otro.

Está hecho con lo mismo que vimos en Taller de Programación 2, clase por clase:

- **Clases 4 y 5:** Express, rutas, controllers y middlewares.
- **Clase 6:** `AppError`, `errorHandler` y validación con Zod.
- **Clases 7 y 8:** DAO, casos de uso y factories.
- **Clase 9:** Sequelize con SQLite y el contenedor.
- **Clase 10:** eventos y notificadores.
- **Clase 11:** bcrypt y JWT.
- **Clase 12:** consumir una API externa con `fetch`.

---

## Índice

1. [¿Qué hace este backend?](#1-qué-hace-este-backend)
2. [Cómo arrancarlo](#2-cómo-arrancarlo)
3. [La idea principal: capas](#3-la-idea-principal-capas)
4. [El viaje de un pedido](#4-el-viaje-de-un-pedido)
5. [Mapa de carpetas](#5-mapa-de-carpetas)
6. [Archivo por archivo](#6-archivo-por-archivo)
7. [Flujos paso a paso](#7-flujos-paso-a-paso)
8. [Todos los endpoints](#8-todos-los-endpoints)
9. [Qué clase está en cada archivo](#9-qué-clase-está-en-cada-archivo)
10. [Tests](#10-tests)
11. [Diferencias con el backend de Python](#11-diferencias-con-el-backend-de-python)
12. [Problemas comunes](#12-problemas-comunes)

---

## 1. ¿Qué hace este backend?

Es la API del juego **AvesBA**: el jugador ve la foto de un ave y tiene que adivinar cuál es entre 4 opciones. Hace lo mismo que el backend de Python (`BackendPnt2`), así que el frontend (`TP-PNT2/AvesBA`) funciona igual, sin cambiar nada.

| Parte | Qué hace |
|---|---|
| **Login** | Registro, login, renovar tokens, logout. Los tokens viajan en cookies (así los usa el front) o en el header `Authorization`. |
| **Usuarios** | Mi perfil, cambiar mi contraseña. Los admins y moderadores listan usuarios; los admins los editan y resetean contraseñas. |
| **Juego** | Iniciar partida (10 preguntas sacadas de iNaturalist), responder (con racha y bonus), retomar si recargás, terminar y ranking. |
| **Métricas** | Las mías (intentos, aciertos, puntos, posición) y las globales (solo admins y moderadores). |
| **Actividad** | El front avisa cuánto tiempo estuvo conectado el jugador cuando cierra la pestaña. |

Hay **tres roles**:
- `jugador`: el que se registra.
- `moderador`: puede ver usuarios y métricas globales.
- `admin`: puede todo.

---

## 2. Cómo arrancarlo

```bash
cd "D:\Programacion Nuevas Tecnologias 2\PT-PNT2\BackendNode"
npm install
```

Si `npm install` avisa que bloqueó `sqlite3`, aprobalo una vez (es el mismo paso de la clase 9):

```bash
npm install-scripts approve sqlite3
npm rebuild sqlite3
```

Después:

1. Copiá `.env.example` como `.env`. Ya hay un `.env` listo en tu PC: este paso es para cuando lo bajes en otra compu.
2. Cambiá `JWT_SECRET` por un texto largo cualquiera.
3. Arrancá el servidor:

```bash
npm run dev
```

La primera vez crea `database.sqlite` y carga los datos de prueba: tarda alrededor de un segundo. Vas a ver algo así:

```
[Persistencia] Usando Sequelize (SQLite)
[Aves] Usando iNaturalist
[Notificaciones] Usando consola
[seed] 100 jugadores de prueba creados (contraseña: Jugador123)
Servidor AvesBA corriendo en http://localhost:8000
```

**Usuarios para probar:**

| Rol | Email | Contraseña |
|---|---|---|
| admin | `admin@avesba.com` | `admin12345` (sale de `ADMIN_PASSWORD` en `.env`) |
| moderador | `jugador001@example.com` a `jugador003@example.com` | `Jugador123` |
| jugador | `jugador004@example.com` a `jugador100@example.com` | `Jugador123` |

**Para usarlo con el frontend:** arrancá este backend y después el front (`npm run dev` en `TP-PNT2/AvesBA`). El front busca la API en `http://localhost:8000`, que es el puerto de este backend. Ojo: no podés tener corriendo al mismo tiempo el backend de Python, porque usan el mismo puerto.

**Para probar a mano:** abrí `requests.http` con la extensión REST Client y mandá los pedidos en orden.

### Las opciones del `.env`

| Variable | Valores | Para qué |
|---|---|---|
| `PERSISTENCE_TYPE` | `sequelize` / `memory` | Guardar en SQLite (queda en disco) o en memoria (se borra al reiniciar). |
| `BIRDS_PROVIDER` | `inaturalist` / `fake` | Aves reales de internet, o 15 aves inventadas para trabajar sin conexión. |
| `NOTIFIER_TYPE` | `console` / `file` / `none` | Dónde van los avisos de los eventos: consola, `notifications.log` o ninguno. |
| `JWT_SECRET` | texto largo | **Obligatorio.** Con esto se firman los tokens. Sin él, la app no arranca. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 15 | Cuánto dura el token de acceso. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | Cuánto dura el token para renovar. |
| `SEED_PLAYERS` | 100 | Cuántos jugadores de prueba cargar (0 = ninguno). |
| `CORS_ORIGIN` | `http://localhost:5173` | Desde qué página web se puede llamar a la API (la del front de Vite). |

---

## 3. La idea principal: capas

El código está dividido en **capas**. Cada capa tiene un solo trabajo y solo habla con la de al lado.

```
   El pedido HTTP entra por arriba
                │
                ▼
┌──────────────────────────────┐
│ routes/      (el mozo)       │  ¿Qué URL es? ¿Quién la atiende? ¿Hace falta login?
├──────────────────────────────┤
│ middlewares/ (la puerta)     │  ¿Tiene token? ¿Tiene permiso? ¿Los datos son válidos?
├──────────────────────────────┤
│ controllers/ (el traductor)  │  Lee req, llama al caso de uso, responde con res
├──────────────────────────────┤
│ usecases/    (el cerebro)    │  LAS REGLAS DEL NEGOCIO. No sabe nada de HTTP.
├──────────────────────────────┤
│ dao/         (el archivero)  │  El único que toca los datos (memoria o SQLite)
└──────────────────────────────┘
```

**¿Por qué tanto lío?** Porque así cada cosa se puede cambiar sin romper las demás:

- Para pasar de memoria a SQLite cambiás **una palabra** en `.env`. Los casos de uso ni se enteran, porque los dos DAOs tienen los mismos métodos.
- Para probar el juego sin internet, usás el proveedor de aves falso. El caso de uso no sabe cuál le tocó.
- Si mañana los avisos van por mail en vez de consola, hacés un notificador nuevo. Nadie más cambia.

**La regla de oro: nadie importa lo que necesita, se lo pasan.** A eso se le dice *inyección de dependencias*. El único archivo que conoce todas las piezas y las conecta es `container/container.js`.

---

## 4. El viaje de un pedido

Seguimos un pedido real de punta a punta: el jugador responde una pregunta.

```
POST /api/inaturalist/juego/respuesta
Cookie: access_token=eyJ...
{ "ave_id": 4867, "respuesta_usuario": "Tero" }
```

```
 1. index.js                 Arrancó el servidor (createApp + listen). El pedido llega a Express.
       │
 2. app.js                   Pasa por los middlewares globales, EN ORDEN:
       │                       cors → logger → express.json → cookieParser
       │                       (ahora req.body es un objeto y req.cookies tiene el token)
       │
 3. container.js             El router principal ve "/api/inaturalist/juego" y se lo pasa
       │                     al router del juego.
       │
 4. routes/gameRoutes.js     Busca la ruta POST "/respuesta" y ejecuta su fila de middlewares:
       │
       ├─ 4a. middlewares/auth.js       authenticate: saca el token de la cookie, lo verifica
       │                                (security/tokenService.js) y deja req.user = { id: 5, role: "jugador" }.
       │                                Si no hay token → 401 y el pedido termina acá.
       │
       ├─ 4b. middlewares/validate.js   Revisa el body con schemas/gameSchema.js (Zod).
       │                                Si ave_id no es un número → 400 y termina acá.
       │
       └─ 4c. controllers/GameController.js   answer: llama a useCases.answerQuestion(req.body, req.user)
                │
 5. usecases/game/answerQuestion.js   LAS REGLAS:
                │   - ¿hay partida activa?          (gameSessionsDao.getActiveByUser)
                │   - ¿ya respondió esta ave?       (gameResultsDao.findInSession)
                │   - ¿el ave está en el lote?
                │   - ¿es correcta? ¿cuánta racha? ¿hay bonus?  (gameRules.js)
                │   - guarda la respuesta           (gameResultsDao.save)
                │   - actualiza la racha            (gameSessionsDao.update)
                │   - si hubo bonus, emite un evento (events.emit)
                │
 6. dao/...SequelizeDao.js    Habla con SQLite a través de los modelos (dao/models/).
                │
 7. Vuelve hacia arriba:      el caso de uso devuelve { es_correcta, puntos_obtenidos, mensaje }
                │             y el controller hace res.json(...) → 200
                │
 8. Si algo falló en cualquier paso, alguien lanzó un AppError:
                              Express lo lleva directo a middlewares/errorHandler.js,
                              que arma la respuesta: { error: { code, message }, detail }
```

**Fijate que el caso de uso nunca ve `req` ni `res`.** Recibe datos comunes (`{ ave_id, respuesta_usuario }`, `{ id, role }`) y devuelve datos comunes. Por eso se puede testear sin levantar un servidor.

---

## 5. Mapa de carpetas

```
BackendNode/
├── index.js              Arranca el servidor (lo único que hace es listen)
├── app.js                Arma la app Express: middlewares globales + rutas + errores
├── .env / .env.example   Configuración (el .env NO se sube a git)
├── requests.http         Pedidos de prueba para REST Client
│
├── config/               Lee el .env (el ÚNICO lugar que toca process.env)
├── container/            El Composition Root: crea todas las piezas y las conecta
│
├── routes/               Qué URL va a qué controller, y con qué middlewares
├── middlewares/          Lo que pasa ANTES del controller: login, permisos, validación, errores
├── schemas/              Las reglas de forma de los datos (Zod)
├── controllers/          Traducen HTTP ↔ casos de uso
│
├── usecases/             Las reglas del negocio, una acción por archivo
│   ├── auth/             registro, login, refresh, admin inicial
│   ├── users/            perfil, contraseña, listado, edición
│   ├── game/             iniciar, preguntas, responder, retomar, terminar, ranking
│   ├── metrics/          métricas del jugador y globales
│   ├── activity/         aviso de desconexión
│   └── seed/             los 100 jugadores de prueba
│
├── dao/                  El acceso a los datos
│   ├── daoFactory.js     Elige memoria o Sequelize según PERSISTENCE_TYPE
│   ├── models/           Los modelos de Sequelize (las tablas) y sus relaciones
│   ├── users/            UsersMemoryDao y UsersSequelizeDao
│   ├── gameSessions/     Las partidas (memoria y Sequelize)
│   └── gameResults/      Las respuestas (memoria y Sequelize)
├── connection/           La conexión a SQLite
│
├── security/             bcrypt (contraseñas), JWT (tokens), intentos de login
├── birds/                De dónde salen las aves: iNaturalist (real) o falso
├── events/               El bus de eventos y los nombres de los eventos
├── alerts/               Qué hacer cuando pasa cada evento
├── notifications/        Por dónde avisar: consola, archivo o nada
├── errors/               AppError: el error "esperado" de la app
│
└── tests/                Tests automáticos (npm test)
```

---

## 6. Archivo por archivo

### Raíz

| Archivo | Qué hace | Quién lo usa |
|---|---|---|
| `index.js` | Llama a `createApp()` y pone el servidor a escuchar en el `PORT`. Si algo falla al arrancar, muestra el error y corta. | `npm run dev` / `npm start` |
| `app.js` | Crea la app de Express, pone los middlewares globales en orden (cors, logger, json, cookies), monta todas las rutas del contenedor y al final `notFound` + `errorHandler`. **No** hace `listen`: así los tests pueden crear apps de prueba. | `index.js`, los tests |
| `package.json` | Dependencias y scripts: `dev`, `start` y `test`. | npm |

### `config/`

| Archivo | Qué hace |
|---|---|
| `config.js` | Lee todas las variables del `.env` y las exporta con valores por defecto. Si falta `JWT_SECRET`, **lanza un error y la app no arranca**: un secreto por defecto sería un secreto que conoce todo el mundo. |
| `cookies.js` | Las opciones de las cookies de los tokens: `httpOnly` (JavaScript no las puede leer), `sameSite`, `secure` en producción, y cuánto duran. |

### `container/`

| Archivo | Qué hace |
|---|---|
| `container.js` | **El archivo más importante para entender el proyecto.** Es el único que conoce todo. En orden: (1) pide los DAOs a la factory y los inicializa, (2) elige el proveedor de aves, (3) crea el bus de eventos y le registra los listeners, (4) crea el hasheador, el servicio de tokens y los middlewares de auth, (5) siembra el admin y los jugadores de prueba, (6) arma cada entidad con la cadena **casos de uso → controller → router** y la monta en su URL. Acepta `overrides` para que los tests reemplacen piezas. |

### `routes/`

Todas son *factories*: reciben el controller (y los middlewares de auth) y devuelven un router. Ninguna importa un controller ni un DAO.

| Archivo | Se monta en | Qué tiene |
|---|---|---|
| `healthRoutes.js` | `/` | `GET /`: estado del servidor. Pública. |
| `authRoutes.js` | `/auth` | `register`, `login`, `refresh` y `logout`. Públicas, cada una con su validación. |
| `usersRoutes.js` | `/users` | `router.use(authenticate)` protege todas. `/me` va antes que `/:id` (si no, Express tomaría "me" como un id). Usa `authorize("admin", "moderador")` o `authorize("admin")` según la ruta. |
| `gameRoutes.js` | `/api/inaturalist/juego` | Las 7 rutas del juego, todas con login. |
| `metricsRoutes.js` | `/api/inaturalist/metricas` | `usuario` (con login) y `global` (solo admin y moderador). |
| `activityRoutes.js` | `/api` | `POST /user-connection-log`. Usa `express.text()` + `parseTextJson`, porque el front la manda como texto plano. |

### `middlewares/`

| Archivo | Qué hace |
|---|---|
| `logger.js` | Imprime método, URL y hora de cada pedido. En los tests no imprime nada. |
| `auth.js` | `createAuthMiddlewares(tokens)` devuelve dos middlewares. **`authenticate`**: busca el token (primero en el header `Authorization: Bearer`, después en la cookie `access_token`), lo verifica y deja `req.user = { id, role }`; sin token da 401. **`authorize(...roles)`**: si tu rol no está en la lista, da 403. |
| `validate.js` | `validate(schema)` revisa `req.body` con Zod; `validateQuery` y `validateParams` hacen lo mismo con la query y con los parámetros de la URL. Si algo está mal, da 400 con el detalle de cada campo. Si está bien, reemplaza los datos por los ya convertidos (por ejemplo `"5"` → `5`). |
| `parseTextJson.js` | Convierte un body de texto que tiene JSON adentro en un objeto. Solo lo usa la ruta de actividad. |
| `notFound.js` | Va después de todas las rutas: si nadie atendió el pedido, da 404 `ROUTE_NOT_FOUND`. |
| `errorHandler.js` | **El único lugar que arma respuestas de error.** Si el error es un `AppError`, usa su `statusCode` y su `code`. Si el JSON del body estaba roto, da 400. Cualquier otra cosa es un error inesperado: lo muestra en la consola y responde 500. Siempre responde `{ error: { code, message, details? }, detail }`. El `detail` está para que el front de AvesBA muestre el mensaje, porque así respondía el backend de Python. |

### `schemas/` (Zod)

| Archivo | Qué valida |
|---|---|
| `authSchema.js` | Registro (`nombre`, `apellido`, `email`, `password` de 8 a 72 caracteres). **No acepta `role`**: si un endpoint público dejara elegir el rol, cualquiera se registraría como admin. También login y refresh. |
| `userSchema.js` | Cambio de contraseña, edición de usuario (`role` solo puede ser `jugador`, `moderador` o `admin`), query del listado (`page`, `per_page`, `role`) e id de la URL. |
| `gameSchema.js` | Query de las aves (`place_id`, `locale`, con valores por defecto), body de la respuesta (`ave_id`, `respuesta_usuario`) y `limit` del ranking (1 a 100). |
| `activitySchema.js` | `userId` (o `null`) y `tiempoConectado` en milisegundos. |

### `controllers/`

Todas son **clases** que reciben los casos de uso en el constructor y los guardan en `#useCases` (privado). Cada método es una *arrow function*, para que `this` siga funcionando cuando Express lo llama. **No tienen reglas de negocio**: leen `req`, llaman al caso de uso y responden.

| Archivo | Métodos |
|---|---|
| `HealthController.js` | `status`. |
| `AuthController.js` | `register`, `login`, `refresh` y `logout`. Además del JSON, **pone los tokens en cookies**; `logout` las borra. |
| `UsersController.js` | `me`, `changeMyPassword`, `list`, `get`, `update` y `resetPassword`. Pasa `req.user` como "actor". |
| `GameController.js` | `start`, `questions`, `answer`, `activeSession`, `sessionStats`, `finish` y `ranking`. |
| `MetricsController.js` | `user` y `global`. |
| `ActivityController.js` | `connectionLog` (responde 204, "recibido y no hay nada que devolver"). |

### `usecases/`: las reglas del negocio

Cada carpeta tiene un archivo por acción y un `make...UseCases.js`, la **factory** que recibe las dependencias **una vez** y devuelve las funciones listas para usar (es lo de la clase 8).

**`usecases/auth/`**

| Archivo | Qué hace |
|---|---|
| `registerUser.js` | Si el email ya existe → 409. Hashea la contraseña, crea el usuario **siempre como `jugador`**, emite `user.registered` y devuelve los tokens. |
| `loginUser.js` | Revisa si el email está bloqueado por intentos fallidos. Busca las credenciales y compara con bcrypt. **Si el email no existe o la clave está mal, da el MISMO error**, para no revelar quién tiene cuenta. Un usuario inactivo no entra. Guarda la fecha del último login. |
| `refreshSession.js` | Verifica que sea un token de tipo *refresh* (un access no sirve acá) y que el usuario siga activo. Devuelve tokens nuevos. |
| `issueTokens.js` | Arma `{ access_token, refresh_token, token_type, expires_in }`. El token lleva solo `sub` (el id) y `role`. |
| `seedAdmin.js` | Crea el admin inicial con los datos del `.env`, si no existe. |
| `makeAuthUseCases.js` | La factory: `register`, `login` y `refresh`. |

**`usecases/users/`**

| Archivo | Qué hace |
|---|---|
| `getProfile.js` | Devuelve el usuario del token. No recibe un id de la URL: nadie puede pedir el perfil de otro. |
| `getUserById.js` | **Autorización por dueño:** un jugador solo puede verse a sí mismo; moderadores y admins ven a cualquiera. Esta regla va acá y no en el router, porque depende de *a quién* pertenece el dato. |
| `listUsers.js` | Usuarios activos, paginados: `{ items, total, page, per_page, pages }`. |
| `updateUser.js` | Cambia solo los campos que vinieron (nombre, apellido, rol, activo). |
| `changePassword.js` | Exige la contraseña actual correcta antes de poner la nueva. |
| `resetPassword.js` | Genera una contraseña nueva al azar (con `crypto`, no con `Math.random`) y la devuelve una sola vez. |

**`usecases/game/`**

| Archivo | Qué hace |
|---|---|
| `gameRules.js` | **Funciones puras** con las reglas del juego: 10 puntos por acierto; bonus de +5, +15 y +50 a los 3, 5 y 10 aciertos seguidos; cómo calcular porcentajes y resúmenes; el mensaje de "¡Correcto!". |
| `buildQuestions.js` | Arma el lote: elige 10 aves al azar y, para cada una, 4 opciones mezcladas (la correcta y 3 falsas). |
| `fetchQuestions.js` | Pide las aves al proveedor y arma el lote. Si iNaturalist falla, lo convierte en un error 503 nuestro. |
| `startGame.js` | (1) Trae las preguntas; si falla, corta antes de crear nada. (2) Cierra las partidas activas que hubiera. (3) Crea la partida **guardando el lote**, así después se valida contra lo guardado y el cliente no puede hacer trampa. |
| `getQuestions.js` | Si hay partida activa, devuelve **su** lote (siempre el mismo); si no, arma uno nuevo. |
| `answerQuestion.js` | El de la sección 4: valida, corrige, calcula la racha y el bonus, guarda y emite `game.streakAchieved` si hubo bonus. |
| `getActiveSession.js` | Para retomar la partida: el lote, las respuestas dadas en orden, la racha y los puntos. |
| `getSessionStats.js` | Puntos, intentos, aciertos y porcentaje de la partida en curso. |
| `closeSession.js` | Calcula el resumen, marca la partida como `terminada` y emite `game.finished`. Lo usan `finishGame` y `startGame`. |
| `finishGame.js` | Termina la partida activa (si no hay, 404). |
| `buildRanking.js` | Función pura: con los usuarios y todas las respuestas arma el ranking ordenado (por puntos; si empatan, por aciertos y antigüedad). |
| `getRanking.js` | Los primeros `limit` del ranking. |

**`usecases/metrics/`**

| Archivo | Qué hace |
|---|---|
| `getUserMetrics.js` | Intentos, aciertos, % y puntos de todas mis partidas, y mi posición (sale del mismo `buildRanking`). |
| `getGlobalMetrics.js` | Cuántos jugaron, cuántas respuestas hay, el % global, y el ave más acertada y la menos acertada. Si nadie jugó todavía, devuelve `null` en las aves. |

**`usecases/activity/`** y **`usecases/seed/`**

| Archivo | Qué hace |
|---|---|
| `logConnection.js` | Solo emite el evento `user.disconnected`. |
| `seedPlayers.js` | Crea N jugadores de prueba (los 3 primeros son moderadores), cada uno con 1 a 5 partidas simuladas con **las mismas reglas** del juego real. Si ya existen, no hace nada. |

### `dao/`: los datos

Cada entidad tiene **dos DAOs con exactamente los mismos métodos**: ese es el *contrato*. Uno guarda en arrays (memoria) y el otro en SQLite (Sequelize).

| Archivo | Qué hace |
|---|---|
| `daoFactory.js` | `getUsersDao()`, `getGameSessionsDao()` y `getGameResultsDao()`: según `PERSISTENCE_TYPE`, crea el de memoria o el de Sequelize. |
| `users/Users*Dao.js` | `getAll` (con filtros y paginación), `count`, `getById`, `getByEmail`, `getCredentialsByEmail`, `save` y `update`. **Ninguno devuelve el hash de la contraseña, salvo `getCredentialsByEmail`**, que existe solo para el login. |
| `gameSessions/GameSessions*Dao.js` | `create`, `getById`, `getActiveByUser`, `getAllActiveByUser` y `update`. Guarda el lote de preguntas como JSON. |
| `gameResults/GameResults*Dao.js` | `save`, `saveMany` (muchas juntas, para los datos de prueba), `getBySession` (en orden), `findInSession` y `getAll`. |

Los DAO de Sequelize tienen además `init()`, que prepara la base y crea las tablas.

**`dao/models/`**: las tablas de SQLite

| Archivo | Tabla | Campos principales |
|---|---|---|
| `UserModel.js` | `users` | nombre, apellido, email (único), passwordHash, role, is_active, createdAt, updatedAt, lastLogin |
| `GameSessionModel.js` | `game_sessions` | user_id, estado (`activa`/`terminada`), preguntas (JSON), racha actual y máxima, puntos, intentos, aciertos |
| `GameResultModel.js` | `game_results` | user_id, session_id, ave_id, ave_nombre, respuesta, es_correcta, puntos_obtenidos, bonus_racha |
| `index.js` | — | **Las relaciones**: un usuario tiene muchas partidas, una partida tiene muchas respuestas, y un usuario tiene muchas respuestas. |

Los nombres de los campos son **los mismos que en la base de Python**, porque el frontend los lee tal cual (`puntos_totales`, `es_correcta`, `role`…).

### `connection/`

| Archivo | Qué hace |
|---|---|
| `sequelize.js` | Crea la conexión a SQLite (el archivo es `DB_STORAGE`). `initDatabase()` la prepara **una sola vez**: activa el modo WAL (sin esto, cargar los 100 jugadores tarda 15 s en vez de 1 s) y crea las tablas con `sync()`. |
| `index.js` | El punto único de acceso a las conexiones. |

### `security/`

| Archivo | Qué hace |
|---|---|
| `passwordHasher.js` | `{ hash, compare }` con bcryptjs. La misma contraseña da hashes distintos cada vez (por la *salt*), y aun así `compare` funciona. |
| `tokenService.js` | `signAccess` (dura 15 min), `signRefresh` (dura 7 días) y `verify`. Si el token venció → 401 `TOKEN_EXPIRED`; si fue modificado o es de otro → 401 `TOKEN_INVALID`. Fija el algoritmo HS256 para rechazar tokens sin firma. |
| `loginAttempts.js` | Cuenta los fallos de login por email. Con 5 fallos en 15 minutos, bloquea ese email → 429. |

### `birds/`: la API externa

| Archivo | Qué hace |
|---|---|
| `inaturalistBirdsProvider.js` | `getBirds({ place_id, locale })` hace `fetch` a iNaturalist (corta a los 10 s), se queda con las aves que tienen foto y nombre, y las pasa a nuestro formato. Si falla, lanza un error. |
| `fakeBirdsProvider.js` | El mismo contrato, pero devuelve 15 aves inventadas sin internet. Lo usan los tests y `BIRDS_PROVIDER=fake`. |
| `birdsProviderFactory.js` | Elige uno u otro según `BIRDS_PROVIDER`. |
| `argentineNames.js` | Cambia el nombre de iNaturalist por el que usamos acá ("Corúa Neotropical" → "Biguá"). |

### `events/`, `alerts/` y `notifications/`: eventos (clase 10)

```
caso de uso ──emit("game.finished")──▶ bus de eventos ──▶ listener (alerts/) ──▶ notificador
  (no sabe quién escucha)                                  (decide qué hacer)     (consola / archivo / nada)
```

| Archivo | Qué hace |
|---|---|
| `events/eventBus.js` | Crea el bus (un `EventEmitter` de Node). |
| `events/eventNames.js` | Los nombres: `user.registered`, `game.finished`, `game.streakAchieved` y `user.disconnected`. |
| `alerts/registerAlertListeners.js` | Para cada evento arma un aviso y lo manda al notificador. Si el notificador falla, **no rompe** el caso de uso que emitió el evento. |
| `notifications/*Notifier.js` | Consola, archivo (`notifications.log`) o silencioso. Los tres tienen el mismo contrato: `notify({ subject, body })`. |
| `notifications/notifierFactory.js` | Elige uno según `NOTIFIER_TYPE`. |

### `errors/`

| Archivo | Qué hace |
|---|---|
| `AppError.js` | Un error con `code` (para máquinas, ej. `INVALID_CREDENTIALS`), `message` (para personas), `statusCode` (el HTTP) y `details` (opcional). Lo lanzan los casos de uso y los middlewares; lo convierte en respuesta el `errorHandler`. |

---

## 7. Flujos paso a paso

### 7.1 Arranque de la app

```
npm run dev
 └─ index.js → createApp() (app.js)
      ├─ cors, logger, express.json, cookieParser
      ├─ buildContainer() (container.js)
      │    ├─ daoFactory → 3 DAOs → init() → initDatabase(): WAL + crear tablas
      │    ├─ birdsProviderFactory → iNaturalist
      │    ├─ eventBus + registerAlertListeners(notificador)
      │    ├─ hasher, tokens, loginAttempts, auth (authenticate / authorize)
      │    ├─ seedAdmin → crea admin@avesba.com si no existe
      │    ├─ seedPlayers → crea los 100 jugadores si no existen
      │    └─ para cada entidad: make...UseCases(deps) → new ...Controller(useCases) → create...Router(controller, auth)
      ├─ notFound
      └─ errorHandler
 └─ app.listen(8000)
```

### 7.2 Login

```
Front: POST /auth/login { email, password }
 └─ authRoutes: validate(loginSchema) ── email inválido ─▶ 400
     └─ AuthController.login
         └─ loginUser
             ├─ loginAttempts.check(email) ── bloqueado ─▶ 429
             ├─ usersDao.getCredentialsByEmail(email)  ← el único que trae el hash
             ├─ hasher.compare(password, hash) ── no coincide ─▶ registra el fallo ─▶ 401 INVALID_CREDENTIALS
             ├─ ¿is_active? ── no ─▶ 401 USER_INACTIVE
             ├─ usersDao.update(id, { lastLogin })
             └─ issueTokens → { access_token, refresh_token, ... }
         └─ setAuthCookies(res, tokens)  ← el navegador las guarda solo
         └─ 200 { access_token, refresh_token, token_type, mensaje }
```

### 7.3 Un pedido protegido (con el front)

```
Front: GET /users/me   (el navegador agrega solo: Cookie: access_token=eyJ...)
 └─ usersRoutes: router.use(authenticate)
     ├─ token = header Bearer ?? cookie access_token
     ├─ tokens.verify(token) ── vencido ─▶ 401 TOKEN_EXPIRED ── modificado ─▶ 401 TOKEN_INVALID
     ├─ payload.type === "access" ── no ─▶ 401 TOKEN_INVALID
     └─ req.user = { id, role }
 └─ UsersController.me → getProfile(req.user) → usersDao.getById → 200 { id, nombre, ... }  (sin passwordHash)
```

### 7.4 Una partida completa

```
1. POST /juego/iniciar
     startGame: fetchQuestions (iNaturalist → buildQuestions: 10 preguntas × 4 opciones)
                → cierra partidas viejas (closeSession)
                → gameSessionsDao.create({ estado: "activa", preguntas: [...] })
     ◀ { session_id, mensaje }

2. GET /juego/aves        getQuestions: devuelve el lote GUARDADO de la partida activa

3. POST /juego/respuesta  (× 10) answerQuestion: valida contra el lote, racha, bonus, guarda
     ◀ { es_correcta, puntos_obtenidos, mensaje }

   (si recarga la página)
   GET /juego/sesion      getActiveSession: lote + respuestas dadas → el front sigue donde estaba

4. POST /juego/terminar   finishGame → closeSession: resumen, estado "terminada", emite game.finished
     ◀ { session_id, puntos_totales, total_intentos, total_aciertos, porcentaje_acierto, mensaje }

5. GET /juego/ranking     getRanking → buildRanking(usuarios, todas las respuestas)
```

### 7.5 Cómo se calculan los puntos

| Aciertos seguidos | Puntos de esa respuesta |
|---|---|
| 1 | 10 |
| 2 | 10 |
| **3** | 10 + **5** = 15 |
| 4 | 10 |
| **5** | 10 + **15** = 25 |
| 6 a 9 | 10 |
| **10 o más** | 10 + **50** = 60 |
| Un error | 0, y la racha vuelve a 0 |

Una partida perfecta (10 de 10) da 100 + 5 + 15 + 50 = **170 puntos**.

---

## 8. Todos los endpoints

🔓 = público · 🔐 = con login · 👮 = solo admin / moderador · 👑 = solo admin

| Método | Ruta | | Qué hace |
|---|---|---|---|
| GET | `/` | 🔓 | Estado del servidor |
| POST | `/auth/register` | 🔓 | Registrarse (siempre como jugador) |
| POST | `/auth/login` | 🔓 | Iniciar sesión |
| POST | `/auth/refresh` | 🔓 | Renovar tokens (refresh_token en el body o en la cookie) |
| POST | `/auth/logout` | 🔓 | Cerrar sesión (borra las cookies) |
| GET | `/users/me` | 🔐 | Mi perfil |
| PATCH | `/users/me/password` | 🔐 | Cambiar mi contraseña |
| GET | `/users?page=&per_page=&role=` | 👮 | Listar usuarios activos |
| GET | `/users/:id` | 🔐 | Ver un usuario (el jugador, solo a sí mismo) |
| PATCH | `/users/:id` | 👑 | Editar nombre, apellido, rol o activo |
| POST | `/users/:id/reset-password` | 👑 | Generar una contraseña nueva |
| POST | `/api/inaturalist/juego/iniciar?place_id=&locale=` | 🔐 | Iniciar partida |
| GET | `/api/inaturalist/juego/aves?place_id=&locale=` | 🔐 | Preguntas del juego |
| POST | `/api/inaturalist/juego/respuesta` | 🔐 | Responder una pregunta |
| GET | `/api/inaturalist/juego/sesion` | 🔐 | Retomar la partida activa |
| GET | `/api/inaturalist/juego/sesion/estadisticas` | 🔐 | Estadísticas de la partida activa |
| POST | `/api/inaturalist/juego/terminar` | 🔐 | Terminar la partida |
| GET | `/api/inaturalist/juego/ranking?limit=` | 🔐 | Ranking |
| GET | `/api/inaturalist/metricas/usuario` | 🔐 | Mis métricas |
| GET | `/api/inaturalist/metricas/global` | 👮 | Métricas de todo el sistema |
| POST | `/api/user-connection-log` | 🔓 | Aviso de desconexión del front |

### Códigos de error

| Status | Códigos | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, `WRONG_PASSWORD`, `ALREADY_ANSWERED`, `BIRD_NOT_IN_BATCH` | Mandaste algo mal |
| 401 | `TOKEN_MISSING`, `TOKEN_INVALID`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`, `USER_INACTIVE` | No sabemos quién sos |
| 403 | `FORBIDDEN` | Sabemos quién sos, pero no tenés permiso |
| 404 | `USER_NOT_FOUND`, `NO_ACTIVE_SESSION`, `ROUTE_NOT_FOUND` | No existe |
| 409 | `EMAIL_DUPLICATED`, `SESSION_WITHOUT_BATCH` | Choca con lo que ya hay |
| 429 | `TOO_MANY_ATTEMPTS` | Demasiados intentos de login |
| 503 | `BIRDS_UNAVAILABLE`, `NOT_ENOUGH_BIRDS` | iNaturalist no responde |
| 500 | `INTERNAL_ERROR` | Un error que no esperábamos (se ve en la consola) |

---

## 9. Qué clase está en cada archivo

| Clase | Tema | Dónde está |
|---|---|---|
| 3 | `fs`, módulos | `notifications/fileNotifier.js` (`appendFile`), ES Modules en todo el proyecto |
| 4 | Express, CRUD, status codes | `app.js`, todos los `routes/` |
| 5 | Router, controllers, middlewares, `notFound` | `routes/`, `controllers/`, `middlewares/logger.js`, `middlewares/notFound.js` |
| 6 | `AppError`, `errorHandler`, Zod, `validate` | `errors/`, `middlewares/errorHandler.js`, `middlewares/validate.js`, `schemas/` |
| 7 | DAO con clases, casos de uso | `dao/*/*MemoryDao.js`, `usecases/` |
| 8 | Factory de casos de uso, Composition Root | `usecases/*/make*UseCases.js`, `container/container.js` |
| 9 | Sequelize, SQLite, persistencia intercambiable, contenedor | `dao/models/`, `dao/*/*SequelizeDao.js`, `dao/daoFactory.js`, `connection/` |
| 10 | Eventos, listeners, notificadores | `events/`, `alerts/`, `notifications/` |
| 11 | bcrypt, JWT, `authenticate`/`authorize`, autorización por dueño | `security/`, `middlewares/auth.js`, `usecases/auth/`, `usecases/users/getUserById.js` |
| 12 | API externa con `fetch` | `birds/inaturalistBirdsProvider.js` |

---

## 10. Tests

```bash
npm test
```

Corre **222 tests** en unos 7 segundos, **sin internet** y **sin tocar tu `database.sqlite`**: los tests usan SQLite en memoria y el proveedor de aves falso. Usan el runner que viene con Node (`node:test`), así que no hay que instalar nada.

| Archivo | Qué prueba |
|---|---|
| `tests/unit/gameRules.test.js` | Puntos, bonus de racha, porcentajes y mensajes |
| `tests/unit/buildQuestions.test.js` | Lote de 10 preguntas distintas, 4 opciones con la correcta, error si faltan aves |
| `tests/unit/buildRanking.test.js` | Orden y desempates del ranking |
| `tests/unit/argentineNames.test.js` | Los nombres argentinos (los mismos tests que en Python) |
| `tests/unit/security.test.js` | bcrypt, tokens (vencido, modificado, sin firma) y bloqueo de login |
| `tests/unit/daos.test.js` | **Contrato:** los DAOs de memoria y de SQLite se comportan igual, y nunca devuelven el hash |
| `tests/api/auth.test.js` | Registro, login, refresh, logout, cookies, bloqueo |
| `tests/api/users.test.js` | Perfil, contraseña, listado, permisos por rol y por dueño |
| `tests/api/game.test.js` | Toda la partida, el lote, las trampas, la racha, retomar, ranking, iNaturalist caído |
| `tests/api/metrics.test.js` | Métricas propias y globales, permisos, sistema sin partidas |
| `tests/api/events.test.js` | Que cada evento llegue al notificador; el aviso de desconexión |
| `tests/api/app.test.js` | Estado, 404, JSON roto, CORS, flujos completos (incluido uno solo con cookies, como el front) |
| `tests/api/startup.test.js` | Sin `JWT_SECRET` no arranca; carga de datos de prueba sin duplicar |

**Todos los tests de la API corren dos veces: con memoria y con SQLite.** Así se comprueba que cambiar `PERSISTENCE_TYPE` no rompe nada.

`tests/helpers.js` tiene las ayudas: levanta la app en un puerto libre, registra jugadores y loguea al admin. Para inyectar piezas de prueba usa los `overrides` del contenedor. Por ejemplo, un proveedor de aves que siempre falla:

```js
const proveedorCaido = { async getBirds() { throw new Error("sin red"); } };
const api = await startServer({ birdsProvider: proveedorCaido });
```

---

## 11. Diferencias con el backend de Python

Las rutas, los campos de las respuestas y el uso de cookies son **los mismos**, por eso el front funciona sin cambios. Esto es lo que cambió:

| Tema | Python | Node | Por qué |
|---|---|---|---|
| Formato de error | `{ "detail": "..." }` | `{ "error": { code, message, details }, "detail": "..." }` | Es el formato del curso (clase 6). Se mantuvo `detail` para el front. |
| Datos inválidos | 422 | 400 `VALIDATION_ERROR` | Como en la clase 6. |
| Email ya registrado | 400 | 409 `EMAIL_DUPLICATED` | 409 = "choca con algo que ya existe" (así lo usa el profe). |
| IDs | ULID (texto) | Números autoincrementales | Como en todas las clases. |
| Puntos con bonus | El ranking y "terminar" **no** sumaban el bonus, pero "retomar" sí | El bonus se suma **siempre** | Antes el mismo jugador tenía puntajes distintos según la pantalla. |
| Estadísticas de la partida activa | Daban 0 hasta terminar | Se calculan en el momento | Era un bug. |
| Métricas globales sin partidas | Fallaba (variable sin definir) | Devuelve `null` en las aves | Era un bug. |
| Tabla `scores` | Guardaba el puntaje de cada partida | No existe: el puntaje queda en la partida terminada | Era el mismo dato repetido. |
| Aviso de desconexión | No existía (el front recibía 404) | `POST /api/user-connection-log` | El front ya lo mandaba. |
| Documentación `/docs`, `/scalar` | Automática (FastAPI) | `requests.http` + esta guía | Express no la genera; en el curso usamos REST Client. |
| Admin inicial | Email personal | `admin@avesba.com` (se cambia en `.env`) | No poner datos personales en el código. |

---

## 12. Problemas comunes

**"Falta JWT_SECRET en el .env"**
No existe el `.env`, o no tiene `JWT_SECRET`. Copiá `.env.example` como `.env`.

**`Could not locate the bindings file` (sqlite3)**
npm bloqueó la instalación de sqlite3. Corré `npm install-scripts approve sqlite3` y después `npm rebuild sqlite3`.

**`EADDRINUSE: address already in use :::8000`**
Ya hay algo usando el puerto 8000, por ejemplo el backend de Python o otra terminal con este mismo backend. Cerralo, o cambiá `PORT` en el `.env`. Si cambiás el puerto, el front también tiene que apuntar ahí: `VITE_API_BASE_URL` en su `.env`.

**El front dice "Error 401" en todo**
Las cookies vencieron, porque el access token dura 15 minutos. Cerrá sesión y entrá de nuevo.

**El front no puede llamar a la API (error de CORS en la consola del navegador)**
El front está corriendo en otra dirección. Agregala a `CORS_ORIGIN` en el `.env`; podés poner varias separadas por coma.

**Quiero empezar con la base de datos vacía**
Frená el servidor y borrá `database.sqlite` (y si están, `database.sqlite-wal` y `database.sqlite-shm`). Al arrancar se crean de nuevo con el admin y los jugadores de prueba.

**Quiero jugar sin internet**
Poné `BIRDS_PROVIDER=fake` en el `.env`: vas a jugar con 15 aves inventadas.
