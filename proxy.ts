import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Vše kromě API, statických souborů, interních cest Next.js a /art
  // (samostatná stránka mimo locale prefix — nesmí ji next-intl přesměrovat na /cs).
  matcher: "/((?!api|_next|_vercel|art(?:/|$)|.*\\..*).*)",
};
