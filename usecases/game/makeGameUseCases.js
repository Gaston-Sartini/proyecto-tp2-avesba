import startGame from "./startGame.js";
import getQuestions from "./getQuestions.js";
import answerQuestion from "./answerQuestion.js";
import getActiveSession from "./getActiveSession.js";
import getSessionStats from "./getSessionStats.js";
import finishGame from "./finishGame.js";
import getRanking from "./getRanking.js";

/**
 * Factory de Casos de Uso del Juego.
 * Necesita los DAOs de usuarios, partidas y respuestas, el proveedor de aves y el bus de eventos.
 */
function makeGameUseCases({ usersDao, gameSessionsDao, gameResultsDao, birdsProvider, events }) {
  const deps = { usersDao, gameSessionsDao, gameResultsDao, birdsProvider, events };

  return {
    startGame: (options, actor) => startGame(options, actor, deps),
    getQuestions: (options, actor) => getQuestions(options, actor, deps),
    answerQuestion: (answer, actor) => answerQuestion(answer, actor, deps),
    getActiveSession: (actor) => getActiveSession(actor, deps),
    getSessionStats: (actor) => getSessionStats(actor, deps),
    finishGame: (actor) => finishGame(actor, deps),
    getRanking: (options) => getRanking(options, deps),
  };
}

export default makeGameUseCases;
