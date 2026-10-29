import { PORT } from "./config/config.js";
import createApp from "./app.js";

// Punto de entrada: arma la app y la pone a escuchar.
async function startServer() {
  try {
    const app = await createApp();
    app.listen(PORT, () => {
      console.log(`Servidor AvesBA corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Error al inicializar la aplicación:", err);
    process.exit(1);
  }
}

startServer();
