import { Link, useRouterState } from "@tanstack/react-router";
import { House, Search, Coffee, Trophy, User } from "lucide-react";

const ACTIVE_TEXT = "#1C0A00";
const ACTIVE_DOT = "#A8001C";
const INACTIVE = "#CCCCCC";
const BG = "#FFFCF8";
const BORDER = "#E8DDD4";

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
      style={{ background: BG, borderTop: `0.5px solid ${BORDER}` }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
        {TABS.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");
          const color = active ? ACTIVE_TEXT : INACTIVE;
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-0.5 py-1"
              style={{ color, textDecoration: "none" }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 999,
                  marginTop: 2,
                  background: active ? ACTIVE_DOT : "transparent",
                }}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}