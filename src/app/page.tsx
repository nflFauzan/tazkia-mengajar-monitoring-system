import { redirect } from "next/navigation";

/**
 * The application has no public landing page. `src/proxy.ts` already bounces
 * signed-out visitors to /login, so anyone reaching here is authenticated and
 * belongs on the dashboard.
 */
export default function RootPage() {
  redirect("/dashboard");
}
