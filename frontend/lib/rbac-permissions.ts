export type Role = 'OWNER' | 'MANAGER' | 'WAREHOUSE' | 'SALES' | 'FINANCE' | 'STAFF';

// Peta izin (Permissions) berdasarkan Role
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  OWNER: ['*'], // Hak akses penuh
  MANAGER: ['view:*', 'create:*', 'update:*', 'reports:*', 'ai:*'],
  WAREHOUSE: ['view:products', 'update:products', 'view:inventory', 'create:inventory', 'update:inventory', 'view:suppliers', 'create:purchases'],
  SALES: ['view:products', 'view:customers', 'create:customers', 'update:customers', 'view:sales', 'create:sales', 'update:sales'],
  FINANCE: ['view:sales', 'view:purchases', 'view:invoices', 'update:invoices', 'view:reports', 'reports:*'],
  STAFF: ['view:products', 'view:inventory', 'view:sales'],
};

/**
 * Mengecek apakah peran tertentu memiliki hak akses (permission) yang dibutuhkan.
 * Murni komputasi logika tanpa dependensi Node.js / Server DB sehingga aman digunakan di Client Component.
 */
export function hasPermission(userRole: Role, requiredPermission: string): boolean {
  if (userRole === 'OWNER') return true;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  
  if (permissions.includes('*')) return true;
  if (permissions.includes(requiredPermission)) return true;

  // Wildcard match (misal: "view:*" cocok dengan "view:products")
  const [action] = requiredPermission.split(':');
  if (permissions.includes(`${action}:*`)) return true;

  return false;
}

/**
 * Mendapatkan halaman landing default berdasarkan Role pengguna saat login.
 */
export function getRoleDefaultRoute(role: Role): string {
  switch (role) {
    case 'WAREHOUSE':
      return '/Products'; // Staf gudang langsung diarahkan ke Manajemen Produk/Stok
    case 'SALES':
      return '/Sales'; // Tim sales langsung diarahkan ke Sales Orders
    case 'FINANCE':
      return '/ReportsPage'; // Tim keuangan langsung ke Laporan & Faktur
    case 'STAFF':
      return '/Products';
    case 'OWNER':
    case 'MANAGER':
    default:
      return '/Dashboard';
  }
}
