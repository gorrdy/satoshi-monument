import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Vše kromě API, statických souborů a interních cest Next.js.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
