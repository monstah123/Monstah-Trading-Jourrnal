import { auth } from "@/../auth"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isAuthPage = req.nextUrl.pathname.startsWith('/login')
    const isApiRoute = req.nextUrl.pathname.startsWith('/api/')

    if (isApiRoute) {
        return null
    }

    if (isAuthPage) {
        if (isLoggedIn) {
            return Response.redirect(new URL('/dashboard', req.nextUrl))
        }
        return null
    }

    if (!isLoggedIn) {
        return Response.redirect(new URL('/login', req.nextUrl))
    }

    return null
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
