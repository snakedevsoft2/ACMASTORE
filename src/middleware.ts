import { NextResponse, type NextRequest } from "next/server";

/**
 * Protección optimista: sin cookie de sesión no se entra a /admin ni al panel de /cuenta.
 * La verificación real (sesión válida + rol) ocurre en el servidor en cada página y acción.
 */
const PUBLIC_ACCOUNT = ["/cuenta/ingresar", "/cuenta/registro", "/cuenta/recuperar", "/cuenta/restablecer"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAccount = (pathname === "/cuenta" || pathname.startsWith("/cuenta/")) && !PUBLIC_ACCOUNT.some((p) => pathname.startsWith(p));

  if ((isAdmin || isAccount) && !req.cookies.has("acma_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/cuenta/ingresar";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  if (isAdmin) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/cuenta/:path*", "/admin", "/cuenta"] };
