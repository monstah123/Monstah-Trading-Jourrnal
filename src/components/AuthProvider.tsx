"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Auth listener — runs ONCE only. Never recreated on route changes.
  useEffect(() => {
    let timeout: number;
    const finishLoading = (firebaseUser: User | null) => {
      window.clearTimeout(timeout);
      setUser(firebaseUser);
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => finishLoading(firebaseUser),
      () => finishLoading(null)
    );

    // Firebase can remain pending on an unavailable network or invalid config.
    // Do not trap the public landing page behind an indefinite auth check.
    timeout = window.setTimeout(() => {
      setLoading(false);
      setUser(null);
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect logic — separated so it doesn't re-create the auth listener
  useEffect(() => {
    if (loading) return; // Wait until auth is resolved
    
    const isAuthPage = pathname === "/login";
    const isLandingPage = pathname === "/";
    const isPublicApi = pathname.startsWith("/api/share"); // Assuming share is public

    if (user && isAuthPage) {
      router.push("/dashboard");
    } else if (!user && !isAuthPage && !isLandingPage && !isPublicApi) {
      router.push("/login");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg-primary, #0a0a0f)",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
