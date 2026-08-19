"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Package,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
  Zap,
  Store,
  Wallet,
  Layers,
  Box,
  Landmark,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/useUser";
import { logoutUser } from "@/app/actions/auth";

import { hasPermission, Role } from "@/lib/rbac";

type SidebarProps = {
  sidebarOpen: boolean;
  onLogout?: () => void;
};

export default function Sidebar({ sidebarOpen, onLogout }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useUser();

  const handleLogoutClick = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    await logoutUser();
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("flowerp_products_cache");
      localStorage.removeItem("flowerp_active_shift");
      localStorage.removeItem("flowerp_held_orders");
      localStorage.removeItem("flowerp_offline_queue");
      localStorage.removeItem("flowerp_transfers_intransit");
    }
    window.location.href = "/Login";
  };

  const userRole = (user.role || 'OWNER').toUpperCase() as Role;

const rawSidebarItems = [
  { icon: BarChart3, label: "Dashboard", path: "/Dashboard", permission: "view:dashboard" },

  // Sales
  { icon: Store, label: "POS Terminal", path: "/POS", permission: "create:sales" },
  { icon: TrendingUp, label: "Sales", path: "/Sales", permission: "view:sales" },
  { icon: Users, label: "Customers", path: "/Customers", permission: "view:customers" },

  // Inventory
  { icon: Package, label: "Products", path: "/Products", permission: "view:products" },
  { icon: ShoppingCart, label: "Inventory", path: "/ProductInventory", permission: "view:inventory" },
  { icon: ClipboardCheck, label: "Stock Opname", path: "/StockOpname", permission: "view:inventory" },
  { icon: Layers, label: "Batch & Kadaluarsa", path: "/Batches", permission: "view:inventory" },
  { icon: Box, label: "Product Bundles", path: "/Bundles", permission: "view:inventory" },

  // Purchasing
  { icon: Package, label: "Suppliers", path: "/Suppliers", permission: "view:suppliers" },
  { icon: FileText, label: "Purchases", path: "/Purchases", permission: "create:purchases" },

  // Finance & Reports
  { icon: Wallet, label: "Finance", path: "/Finance", permission: "view:reports" },
  { icon: Landmark, label: "Accounting & COA", path: "/Accounting", permission: "view:reports" },
  { icon: BarChart3, label: "Reports", path: "/ReportsPage", permission: "view:reports" },

  // Intelligence
  { icon: Zap, label: "AI Insights", path: "/AI-Insights", permission: "ai:insights" },
];

  const sidebarItems = rawSidebarItems.filter((item) => {
    if (userRole === 'OWNER') return true;
    if (item.path === '/Dashboard' && userRole === 'MANAGER') return true;
    return hasPermission(userRole, item.permission);
  });

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => sidebarOpen && onLogout ? null : undefined}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden print:hidden"
        />
      )}

      <aside
        className={`${
          sidebarOpen ? "w-64 translate-x-0" : "-translate-x-full md:translate-x-0 md:w-20"
        } fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 dark:bg-gray-900 dark:border-gray-800 print:hidden`}
      >
      {/* Logo */}
      <div className={`p-5 border-b border-gray-200 dark:border-gray-800 ${!sidebarOpen ? "flex justify-center px-2" : ""}`}>
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/Dashboard')}>
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-tr from-sky-600 to-sky-400 shadow-md shadow-sky-500/25   transition-all duration-300 group-hover:scale-105 group-hover:shadow-sky-500/40">
            <span className="text-lg font-black text-white">F</span>
          </div>

          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="bg-linear-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent text-lg font-black">
                  FlowERP
                </span>
              </div>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 tracking-wide truncate">
                Enterprise Intelligence
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path;

          return (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              title={!sidebarOpen ? item.label : undefined}
              className={`w-full flex items-center ${
                sidebarOpen ? "gap-3 px-4" : "justify-center px-2"
              } py-3 rounded-lg transition-colors ${
                active
                  ? "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && (
                <span className="font-medium truncate">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Profile */}
      <div className="p-4 border-t border-gray-200 space-y-2 dark:border-gray-800">
        <button
          onClick={() => router.push('/Settings')}
          title={!sidebarOpen ? "Settings" : undefined}
          className={`w-full flex items-center ${
            sidebarOpen ? "gap-3 px-4" : "justify-center px-2"
          } py-2.5 rounded-lg transition-colors cursor-pointer ${
            pathname === '/Settings'
              ? 'bg-sky-50 text-sky-600 font-semibold dark:bg-sky-950/60 dark:text-sky-400'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          {sidebarOpen && <span className="text-sm font-medium truncate">Settings</span>}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            title={!sidebarOpen ? user.name : undefined}
            className={`flex items-center ${
              sidebarOpen ? "gap-3 px-4" : "justify-center px-2"
            } py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer outline-none w-full`}
          >
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback suppressHydrationWarning className="bg-sky-600 text-white font-semibold">
                {user.avatarFallback}
              </AvatarFallback>
            </Avatar>

            {sidebarOpen && (
              <div className="flex-1 min-w-0 text-left">
                <p suppressHydrationWarning className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p suppressHydrationWarning className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email || user.companyName}
                </p>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
              <p suppressHydrationWarning className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
              <p suppressHydrationWarning className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
            <DropdownMenuItem onClick={() => router.push('/Settings')} className="cursor-pointer">Profile & Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/Settings')} className="cursor-pointer">Company Settings</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Billing</DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogoutClick}
              className="text-red-600 dark:text-red-400 cursor-pointer"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
    </>
  );
}