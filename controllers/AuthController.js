import { COOKIE_OPTIONS, ACCESS_COOKIE_MAX_AGE, REFRESH_COOKIE_MAX_AGE } from "../config/cookies.js";

// Guarda los tokens en cookies httpOnly (el front de AvesBA las usa en cada pedido)
function setAuthCookies(res, { access_token, refresh_token }) {
  res.cookie("access_token", access_token, { ...COOKIE_OPTIONS, maxAge: ACCESS_COOKIE_MAX_AGE });
  res.cookie("refresh_token", refresh_token, { ...COOKIE_OPTIONS, maxAge: REFRESH_COOKIE_MAX_AGE });
}

/**
 * Controlador de Autenticación.
 * Recibe los casos de uso por inyección de dependencias; no conoce DAOs, bcrypt ni JWT.
 * Además del JSON, deja los tokens en cookies: así funcionan tanto el front (cookies)
 * como REST Client o Postman (header Authorization con el token del JSON).
 */
class AuthController {
  #useCases;

  constructor(useCases) {
    this.#useCases = useCases;
  }

  // POST /auth/register
  register = async (req, res) => {
    const tokens = await this.#useCases.register(req.body);
    setAuthCookies(res, tokens);
    res.status(201).json(tokens);
  };

  // POST /auth/login
  login = async (req, res) => {
    const tokens = await this.#useCases.login(req.body);
    setAuthCookies(res, tokens);
    res.json({ ...tokens, mensaje: "Inicio de sesión exitoso" });
  };

  // POST /auth/refresh — el refresh_token puede venir en el body o en la cookie
  refresh = async (req, res) => {
    const refreshToken = req.body.refresh_token ?? req.cookies?.refresh_token;
    const tokens = await this.#useCases.refresh(refreshToken);
    setAuthCookies(res, tokens);
    res.json(tokens);
  };

  // POST /auth/logout — borra las cookies con las mismas opciones con las que se crearon
  logout = (req, res) => {
    res.clearCookie("access_token", COOKIE_OPTIONS);
    res.clearCookie("refresh_token", COOKIE_OPTIONS);
    res.json({ mensaje: "Sesión cerrada exitosamente" });
  };
}

export default AuthController;
