import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  FileText,
  BarChart3,
  Download,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Overview and statistics",
  },
  {
    name: "Add Legislation",
    href: "/addlegislation",
    icon: Plus,
    description: "Create new legislation",
  },
  {
    name: "View Legislations",
    href: "/listlegislation",
    icon: FileText,
    description: "Browse all legislations",
  },
  {
    name: "View Comments",
    href: "/comments",
    icon: FileText,
    description: "Browse all comments",
  },
  {
    name: "Analytics",
    href: "/analysis",
    icon: BarChart3,
    description: "Reports and insights",
  },
  {
    name: "Export Reports",
    href: "/export",
    icon: Download,
    description: "Download reports",
  },
];

const bottomNavigation = [
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "System configuration",
  },
  {
    name: "Logout",
    href: "/logout",
    icon: LogOut,
    description: "Sign out",
  },
];

export function Sidebar({ onToggle }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onToggle?.(newCollapsed);
  };

  const isActiveRoute = (href) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <div
      className={`
        fixed top-0 left-0 h-screen bg-sidebar
        bg-gray-300
        shadow-sm transition-all duration-300 ease-in-out z-50 rounded-r-4xl
        ${isCollapsed ? "w-20" : "w-72"}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Gov Portal
              </h1>
              <p className="text-xs text-muted-foreground">
                Legislation System
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleToggle}
          className="p-2 rounded-lg hover:bg-sidebar-item-hover transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-sidebar-item" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-sidebar-item" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex flex-col h-full">
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = isActiveRoute(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-3 rounded-xl text-base
                    transition-colors duration-200 group focus:outline-none
                    ${
                      isActive
                        ? "bg-blue-100 text-black ring-1 ring-blue-200"
                        : "text-black hover:bg-gray-50"
                    }
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon
                    className={`
                      w-5 h-5 flex-shrink-0 text-black
                      ${!isCollapsed && "mr-3"}
                    `}
                  />

                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 mt-auto">
          <div className="space-y-1">
            {bottomNavigation.map((item) => {
              const isActive = isActiveRoute(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-3 py-2 rounded-xl text-base font-medium
                    transition-colors duration-200
                    ${
                      isActive
                        ? "bg-blue-50 text-black ring-1 ring-blue-200"
                        : "text-black hover:bg-gray-50"
                    }
                    ${
                      item.name === "Logout" &&
                      "hover:bg-red-50 hover:text-red-600"
                    }
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon
                    className={`
                      w-5 h-5 flex-shrink-0 text-black
                      ${!isCollapsed && "mr-3"}
                    `}
                  />

                  {!isCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                </Link>
              );
            })}
            {!isCollapsed && (
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                Government Portal
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
