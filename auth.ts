import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google,
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize({ email, password }) {
                // In a real app, you would verify against a database
                if (email === "demo@monstah.com" && password === "demo123") {
                    return { id: "1", name: "Demo User", email: "demo@monstah.com" }
                }
                return null
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
})
