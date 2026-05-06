import { Link, useRouterState } from "@tanstack/react-router";
import { House, Search, Coffee, Trophy, User } from "lucide-react";

const ACTIVE = "#A8001C";
const INACTIVE = "#8A7E76";
const BG = "#FFFCF8";
const BORDER = "#E8E0D8";

const TABS = [
  { to: "/", label: "Home", Icon: House },
  { to: "/clinics", label: "Clinics", Icon: Search },
  { to: "/tea", label: "Tea", Icon: Coffee },
  { to: "/products", label: "Ranking", Icon: Trophy },
  { to: "/skin-profile", label: "My Skin", Icon: User },
] as const;

export default function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ background: BG, borderTop: `1px solid ${BORDER}` }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
        {TABS.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");
          const color = active ? ACTIVE : INACTIVE;
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-0.5 py-1"
              style={{ color, textDecoration: "none" }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}