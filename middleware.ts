import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/register/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/admin/login") ||
    pathname.startsWith("/bank/login") ||
    pathname.startsWith("/pme/login") ||
    pathname === "/" ||
    pathname.startsWith("/fichiers-de-test")
  ) {
    return NextResponse.next()
  }

  // Check KYC status for PME routes (except login, register, waiting)
  if (pathname.startsWith("/pme/") && !pathname.startsWith("/pme/login") && !pathname.startsWith("/pme/kyc-onboarding")) {
    try {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
      
      if (!token || (token as any).role !== "pme") {
        return NextResponse.redirect(new URL("/pme/login", request.url))
      }

      // Check KYC status from API
      const userId = token.sub
      if (userId) {
        try {
          const kycResponse = await fetch(`${request.nextUrl.origin}/api/kyc/status?userId=${userId}`, {
            headers: {
              cookie: request.headers.get("cookie") || "",
            },
          })

          if (kycResponse.ok) {
            const kycData = await kycResponse.json()
            
            // If KYC is pending or reviewing, redirect to waiting page
            if (kycData.kycStatus === "pending" || kycData.kycStatus === "reviewing") {
              return NextResponse.redirect(new URL(`/register/pme/waiting?companyId=${kycData.companyId}`, request.url))
            }
            
            // If KYC is rejected, allow access to kyc-onboarding
            if (kycData.kycStatus === "rejected" && !pathname.startsWith("/pme/kyc-onboarding")) {
              return NextResponse.redirect(new URL("/pme/kyc-onboarding?rejected=true", request.url))
            }
          }
        } catch (error) {
          // If KYC check fails, allow access (fallback)
          console.error("[middleware] KYC check error:", error)
        }
      }
    } catch (error) {
      // If token check fails, redirect to login
      return NextResponse.redirect(new URL("/pme/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/pme/:path*",
    "/admin/:path*",
    "/bank/:path*",
  ],
}






