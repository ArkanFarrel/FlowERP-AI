"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Moon,
  RefreshCw,
  Search,
  Sun,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dispatch, SetStateAction, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getRealtimeNotifications, type NotificationItem } from "@/app/actions/notifications";

type TopbarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
  isDark: boolean;
  setIsDark: Dispatch<SetStateAction<boolean>>;
  onRefresh?: () => void;
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export default function Topbar({
  sidebarOpen,
  setSidebarOpen,
  isDark,
  setIsDark,
  onRefresh,
  isLoading = false,
  searchPlaceholder = "Search products, customers, orders...",
  searchValue,
  onSearchChange,
}: TopbarProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await getRealtimeNotifications();
      if (res && res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.count);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 dark:bg-gray-900 dark:border-gray-800 print:hidden">
      {/* Left side: Menu Toggle & Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
      </div>

      {/* Right side: Actions & Controls */}
      <div className="flex items-center gap-4">
        {onRefresh && (
          <button
            onClick={() => {
              fetchNotifs();
              onRefresh();
            }}
            title="Refresh data"
            className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
          </button>
        )}

        {/* NOTIFICATION CENTER DROPDOWN */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="p-2 hover:bg-gray-100 rounded-lg relative dark:hover:bg-gray-800 transition-colors outline-none cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-red-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 rounded-t-2xl">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-sky-600" /> Notifications Center
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 rounded-full">
                {unreadCount} Alerts
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (notif.link) router.push(notif.link);
                    }}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-start gap-2.5"
                  >
                    {notif.type === 'critical' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    ) : (
                      <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {notif.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {notif.message}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1 font-mono">
                        {notif.time}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  Tidak ada notifikasi peringatan. Semua stok & faktur aman.
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title="Toggle Dark Mode"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium dark:bg-gray-800 dark:hover:bg-gray-700 outline-none cursor-pointer">
            Company <ChevronDown className="w-4 h-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer">FlowERP Store (Current)</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">TechCorp</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Manage Companies</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}