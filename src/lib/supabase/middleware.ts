import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = pathname.startsWith("/app");
  const isAuthRoute = pathname === "/login" || pathname === "/forgot-password" || pathname === "/update-password";

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtectedRoute && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.account_status === "suspended" || profile?.account_status === "inactive") {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("error", profile.account_status === "suspended" ? "Account suspended" : "Account inactive");
      return NextResponse.redirect(redirectUrl);
    }

    await supabase.from("profiles").update({ last_login: new Date().toISOString() }).eq("id", user.id);
  }

  if (isAuthRoute && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
