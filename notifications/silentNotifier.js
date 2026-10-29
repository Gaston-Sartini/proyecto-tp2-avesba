/**
 * Notificador que no hace nada (mismo contrato que los otros).
 * Se usa en los tests para que los avisos no ensucien la salida.
 */
const silentNotifier = {
  async notify() {},
};

export default silentNotifier;
