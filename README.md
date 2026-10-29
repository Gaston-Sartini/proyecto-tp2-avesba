# AvesBA API (Node + Express)

Backend del juego **AvesBA** hecho con la arquitectura en capas de Taller de Programación 2:
Express · Zod · DAO (memoria / Sequelize + SQLite) · Composition Root · eventos · bcrypt + JWT · iNaturalist con `fetch`.

```bash
npm install
cp .env.example .env      # y cambiá JWT_SECRET
npm run dev               # http://localhost:8000
npm test                  # 222 tests, sin internet
```

📖 **Toda la explicación (carpetas, archivos, flujos, endpoints): [GUIA.md](GUIA.md)**

🧪 Pruebas a mano: [requests.http](requests.http) con la extensión REST Client.
