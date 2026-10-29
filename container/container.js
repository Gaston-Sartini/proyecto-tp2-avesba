import { Router } from "express";
import {
  APP_NAME,
  APP_VERSION,
  ACCESS_TOKEN_EXPIRE_MINUTES,
  REFRESH_TOKEN_EXPIRE_DAYS,
  BCRYPT_ROUNDS,
  JWT_SECRET,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_LOCK_MINUTES,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  SEED_PLAYERS,
  SEED_PLAYERS_PASSWORD,
} from "../config/config.js";

// Persistencia, aves y notificaciones (cada una con su factory)
import { getUsersDao, getGameSessionsDao, getGameResultsDao } from "../dao/daoFactory.js";
import { getBirdsProvider } from "../birds/birdsProviderFactory.js";
import { getNotifier } from "../notifications/notifierFactory.js";

// Eventos
import createEventBus from "../events/eventBus.js";
import registerAlertListeners from "../alerts/registerAlertListeners.js";

// Seguridad
import createPasswordHasher from "../security/passwordHasher.js";
import createTokenService from "../security/tokenService.js";
import createLoginAttempts from "../security/loginAttempts.js";
import createAuthMiddlewares from "../middlewares/auth.js";

// Casos de uso
import makeAuthUseCases from "../usecases/auth/makeAuthUseCases.js";
import makeUserUseCases from "../usecases/users/makeUserUseCases.js";
import makeGameUseCases from "../usecases/game/makeGameUseCases.js";
import makeMetricsUseCases from "../usecases/metrics/makeMetricsUseCases.js";
import makeActivityUseCases from "../usecases/activity/makeActivityUseCases.js";
import makePartidaUseCases from "../usecases/partidas/makePartidaUseCases.js";
import seedAdmin from "../usecases/auth/seedAdmin.js";
import seedPlayers from "../usecases/seed/seedPlayers.js";

// Controladores
import HealthController from "../controllers/HealthController.js";
import AuthController from "../controllers/AuthController.js";
import UsersController from "../controllers/UsersController.js";
import GameController from "../controllers/GameController.js";
import MetricsController from "../controllers/MetricsController.js";
import ActivityController from "../controllers/ActivityController.js";
import PartidasController from "../controllers/PartidasController.js";

// Routers
import createHealthRouter from "../routes/healthRoutes.js";
import createAuthRouter from "../routes/authRoutes.js";
import createUsersRouter from "../routes/usersRoutes.js";
import createGameRouter from "../routes/gameRoutes.js";
import createMetricsRouter from "../routes/metricsRoutes.js";
import createActivityRouter from "../routes/activityRoutes.js";
import createPartidasRouter from "../routes/partidasRoutes.js";

/**
 * Composition Root centralizado.
 * Es el ÚNICO lugar de la aplicación que conoce las piezas concretas (qué DAO, qué notificador,
 * qué proveedor de aves, bcrypt, JWT) y las conecta. Todo lo demás recibe sus dependencias por parámetro.
 *
 * `overrides` permite reemplazar piezas desde afuera sin tocar este archivo
 * (los tests lo usan para pasar un proveedor de aves que falla o un DAO que quieren inspeccionar).
 */
async function buildContainer(overrides = {}) {
  // 1. DAOs (memoria o Sequelize según PERSISTENCE_TYPE). Si tienen init (Sequelize), crea las tablas.
  const usersDao = overrides.usersDao ?? getUsersDao();
  const gameSessionsDao = overrides.gameSessionsDao ?? getGameSessionsDao();
  const gameResultsDao = overrides.gameResultsDao ?? getGameResultsDao();
  for (const dao of [usersDao, gameSessionsDao, gameResultsDao]) {
    if (typeof dao.init === "function") await dao.init();
  }

  // 2. Proveedor de aves (iNaturalist o falso)
  const birdsProvider = overrides.birdsProvider ?? getBirdsProvider();

  // 3. Eventos: el bus conecta a quien emite (casos de uso) con quien escucha (alertas)
  const events = createEventBus();
  registerAlertListeners(events, overrides.notifier ?? getNotifier());

  // 4. Seguridad
  const hasher = createPasswordHasher({ rounds: BCRYPT_ROUNDS });
  const tokens = createTokenService({
    secret: JWT_SECRET,
    accessExpiresInSeconds: ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    refreshExpiresInSeconds: REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
  });
  const loginAttempts = createLoginAttempts({ maxAttempts: LOGIN_MAX_ATTEMPTS, windowMs: LOGIN_LOCK_MINUTES * 60 * 1000 });
  const auth = createAuthMiddlewares(tokens);

  // 5. Datos iniciales: DESPUÉS de init(), porque en Sequelize las tablas se crean ahí
  await seedAdmin({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }, { usersDao, hasher });
  await seedPlayers(
    { cantidad: SEED_PLAYERS, password: SEED_PLAYERS_PASSWORD },
    { usersDao, gameSessionsDao, gameResultsDao, hasher }
  );

  // 6. Casos de uso → Controladores → Routers
  const router = Router();

  router.use("/", createHealthRouter(new HealthController({ appName: APP_NAME, version: APP_VERSION })));

  const authController = new AuthController(makeAuthUseCases({ usersDao, hasher, tokens, loginAttempts, events }));
  router.use("/auth", createAuthRouter(authController));

  const usersController = new UsersController(
    makeUserUseCases({ usersDao, gameSessionsDao, gameResultsDao, hasher, events })
  );
  router.use("/users", createUsersRouter(usersController, auth));

  const gameController = new GameController(
    makeGameUseCases({ usersDao, gameSessionsDao, gameResultsDao, birdsProvider, events })
  );
  router.use("/api/inaturalist/juego", createGameRouter(gameController, auth));

  const partidasController = new PartidasController(
    makePartidaUseCases({ gameSessionsDao, gameResultsDao, birdsProvider, events })
  );
  router.use("/partidas", createPartidasRouter(partidasController, auth));

  const metricsController = new MetricsController(makeMetricsUseCases({ usersDao, gameResultsDao }));
  router.use("/api/inaturalist/metricas", createMetricsRouter(metricsController, auth));

  const activityController = new ActivityController(makeActivityUseCases({ events }));
  router.use("/api", createActivityRouter(activityController));

  // Retornamos el router principal listo para ser usado por Express
  return router;
}

export default buildContainer;
