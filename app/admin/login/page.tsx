import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

async function login(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/admin"
    });
  } catch (error) {
    if (error instanceof AuthError) redirect("/admin/login?error=credentials");
    throw error;
  }
}

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink p-5">
      <form action={login} className="grid w-full max-w-md gap-4 rounded-vv border border-white/15 bg-white p-6 shadow-strong">
        <div>
          <p className="vv-kicker text-retail">Admin</p>
          <h1 className="text-3xl font-extrabold">Vision Vistara dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Use the admin account seeded through Railway environment variables.</p>
        </div>
        <label className="grid gap-2 text-sm font-extrabold text-slate-600">
          Email
          <input className="store-input" type="email" name="email" required />
        </label>
        <label className="grid gap-2 text-sm font-extrabold text-slate-600">
          Password
          <input className="store-input" type="password" name="password" required />
        </label>
        <button className="vv-button-retail" type="submit">Sign in</button>
      </form>
    </main>
  );
}
