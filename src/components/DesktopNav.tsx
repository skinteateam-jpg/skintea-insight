import { Link, useRouterState } from "@tanstack/react-router";
import { House, Search, Coffee, Trophy, User, Bell } from "lucide-react";

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const BG = "#FFFCF8";
const BORDER = "#E8DDD4";
const INACTIVE = "#999999";

const TABS = [
  { to: "/", label: "Home", Icon: House },
  { to: "/clinics", label: "Clinics", Icon: Search },
  { to: "/tea", label: "Tea", Icon: Coffee },
  { to: "/products", label: "Ranking", Icon: Trophy },
  { to: "/skin-profile", label: "My Skin", Icon: User },
] as const;

export default function DesktopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header
      className="hidden md:flex sticky top-0 z-50 items-center justify-between px-8 py-3"
      style={{ background: BG, borderBottom: `0.5px solid ${BORDER}` }}
    >
      <div className="flex items-center gap-10">
        <Link to="/" style={{ textDecoration: "none", lineHeight: 1 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: ESPRESSO }}>Skin</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: CRIMSON }}>tea</span>
        </Link>
        <nav className="flex items-center gap-7">
          {TABS.map(({ to, label }) => {
            const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                style={{
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? ESPRESSO : INACTIVE,
                  paddingBottom: 4,
                  borderBottom: active ? `2px solid ${CRIMSON}` : "2px solid transparent",
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4" style={{ color: ESPRESSO }}>
        <Bell size={18} />
      </div>
    </header>
  );
}
