// Expõe os endpoints do Auth.js (/api/auth/signin, /callback/google, /session, ...)
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
