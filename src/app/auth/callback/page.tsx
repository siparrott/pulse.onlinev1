export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <h1 className="text-xl font-bold text-zinc-100">Completing sign in...</h1>
        <p className="mt-2 text-sm text-zinc-400">You'll be redirected shortly.</p>
      </div>
    </main>
  )
}
