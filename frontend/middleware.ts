import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type UserRole = 'OWNER' | 'MANAGER' | 'WAREHOUSE' | 'SALES' | 'FINANCE' | 'STAFF';

/**
 * Peta Hak Akses Halaman (Allowed Routes) berdasarkan Role Pengguna
 */
const ROLE_ALLOWED_ROUTES: Record<UserRole, string[]> = {
  OWNER: [
    '/Dashboard',
    '/Products',
    '/ProductInventory',
    '/Sales',
    '/Customers',
    '/Suppliers',
    '/Purchases',
    '/ReportsPage',
    '/AI-Insights',
    '/POS',
    '/Settings',
  ],
  MANAGER: [
    '/Dashboard',
    '/Products',
    '/ProductInventory',
    '/Sales',
    '/Customers',
    '/Suppliers',
    '/Purchases',
    '/ReportsPage',
    '/AI-Insights',
    '/POS',
    '/Settings',
  ],
  WAREHOUSE: [
    '/Products',
    '/ProductInventory',
    '/Purchases',
    '/Suppliers',
    '/Settings',
  ],
  SALES: [
    '/Sales',
    '/POS',
    '/Customers',
    '/Products',
    '/Settings',
  ],
  FINANCE: [
    '/ReportsPage',
    '/Sales',
    '/Purchases',
    '/Customers',
    '/Suppliers',
    '/Settings',
  ],
  STAFF: [
    '/Products',
    '/ProductInventory',
    '/Settings',
  ],
};

/**
 * Halaman Landing Default per Role saat terjadi Redirect / Akses Ditolak
 */
const ROLE_DEFAULT_LANDING: Record<UserRole, string> = {
  OWNER: '/Dashboard',
  MANAGER: '/Dashboard',
  WAREHOUSE: '/Products',
  SALES: '/Sales',
  FINANCE: '/ReportsPage',
  STAFF: '/Products',
};

const PROTECTED_PATHS = [
  '/Dashboard',
  '/Products',
  '/ProductInventory',
  '/Sales',
  '/Customers',
  '/Suppliers',
  '/Purchases',
  '/ReportsPage',
  '/AI-Insights',
  '/POS',
  '/Settings',
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const authToken = request.cookies.get('auth_token')?.value || request.cookies.get('access_token')?.value;
  const userRole = (request.cookies.get('user_role')?.value || 'OWNER').toUpperCase() as UserRole;

  const isProtected = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  // 1. Jika mencoba membuka halaman terproteksi tapi belum login -> Redirect ke /Login
  if (isProtected && !authToken) {
    const loginUrl = new URL('/Login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Jika sudah login dan membuka halaman terproteksi -> Cek Izin Role (RBAC)
  if (isProtected && authToken) {
    const allowedRoutes = ROLE_ALLOWED_ROUTES[userRole] || ROLE_ALLOWED_ROUTES.OWNER;
    const isAllowed = allowedRoutes.some((route) => pathname.startsWith(route));

    // Jika role pengguna tidak memiliki izin ke halaman tersebut -> Redirect ke Landing Page khas perannya
    if (!isAllowed) {
      const targetLanding = ROLE_DEFAULT_LANDING[userRole] || '/Products';
      return NextResponse.redirect(new URL(targetLanding, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/Dashboard/:path*',
    '/Products/:path*',
    '/ProductInventory/:path*',
    '/Sales/:path*',
    '/Customers/:path*',
    '/Suppliers/:path*',
    '/Purchases/:path*',
    '/ReportsPage/:path*',
    '/AI-Insights/:path*',
    '/POS/:path*',
    '/Settings/:path*',
  ],
};
