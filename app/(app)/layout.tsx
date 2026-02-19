"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Cable,
  Blocks,
  Puzzle,
  Hexagon,
} from "lucide-react";
import { SessionProvider } from "next-auth/react";
import { Providers } from "@/components/providers";
import { UserMenu } from "@/components/auth/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";

const EXPAND_DELAY = 200;
const COLLAPSE_DELAY = 300;

const navItems = [
  { title: "Dashboards", href: "/dashboards", icon: LayoutDashboard },
  { title: "Connections", href: "/connections", icon: Cable },
  { title: "Data Catalog", href: "/catalog", icon: BookOpen },
  { title: "Semantic Models", href: "/semantic", icon: Blocks },
  { title: "Components", href: "/components", icon: Puzzle },
];

function AppSidebar() {
  const pathname = usePathname();
  const { setOpen } = useSidebar();
  const expandTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (collapseTimeout.current) {
      clearTimeout(collapseTimeout.current);
      collapseTimeout.current = null;
    }
    expandTimeout.current = setTimeout(() => setOpen(true), EXPAND_DELAY);
  }, [setOpen]);

  const handleMouseLeave = useCallback(() => {
    if (expandTimeout.current) {
      clearTimeout(expandTimeout.current);
      expandTimeout.current = null;
    }
    collapseTimeout.current = setTimeout(() => setOpen(false), COLLAPSE_DELAY);
  }, [setOpen]);

  useEffect(() => {
    return () => {
      if (expandTimeout.current) clearTimeout(expandTimeout.current);
      if (collapseTimeout.current) clearTimeout(collapseTimeout.current);
    };
  }, []);

  return (
    <Sidebar
      collapsible="icon"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader>
        <Link
          href="/dashboards"
          className="uppercase tracking-tighter font-black text-xl flex items-center gap-2 px-2 py-1"
        >
          <Hexagon
            className="w-6 h-6 shrink-0 fill-black text-white"
            strokeWidth={2}
          />
          <span className="truncate">DataWeaver</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname?.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <SessionProvider>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </SessionProvider>
    </Providers>
  );
}
