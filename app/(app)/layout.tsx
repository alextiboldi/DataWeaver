"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Hexagon,
  CircleUser,
} from "lucide-react";

const navItems = [
  { title: "Dashboards", href: "/dashboards", icon: LayoutDashboard },
  { title: "Data Catalog", href: "/catalog", icon: BookOpen },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[264px] border-r-2 border-black bg-white flex flex-col">
      <div className="p-4 border-b-2 border-black">
        <Link
          href="/dashboards"
          className="uppercase tracking-tighter font-black text-xl flex items-center gap-2"
        >
          <Hexagon
            className="w-6 h-6 fill-black text-white"
            strokeWidth={2}
          />
          DataWeaver
        </Link>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-none px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              pathname?.startsWith(item.href)
                ? "bg-black text-white"
                : "hover:bg-neutral-100"
            }`}
          >
            <item.icon className="size-4" strokeWidth={2} />
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>
      <div className="border-t-2 border-black p-2">
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <CircleUser className="size-4" strokeWidth={2} />
          <span>User</span>
        </div>
      </div>
    </aside>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
