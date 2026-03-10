import { signIn } from "@/../auth"

export default function LoginPage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
            <div className="card" style={{ width: '400px', padding: '32px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Welcome Back!</h2>
                    <p className="text-muted" style={{ marginTop: '8px' }}>Sign in to Monstah Trading Journal</p>
                </div>

                <form action={async (formData) => {
                    "use server"
                    await signIn("credentials", formData)
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Email</label>
                        <input className="form-input" name="email" type="email" placeholder="demo@monstah.com" required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Password</label>
                        <input className="form-input" name="password" type="password" placeholder="demo123" required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                        Sign In with Email
                    </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-primary)' }} />
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-primary)' }} />
                </div>

                <form action={async () => {
                    "use server"
                    await signIn("google")
                }}>
                    <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                        <span style={{ marginRight: '8px' }}>Google</span> Sign In with Google
                    </button>
                </form>
            </div>
        </div>
    )
}
