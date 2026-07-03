import { Link } from "@tanstack/react-router";

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: `0.5px solid ${BORDER}`,
        padding: "24px 16px",
        background: "#FFFCF8",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", gap: 20, fontSize: 13, fontWeight: 600 }}>
          <Link to="/about" style={{ color: ESPRESSO, textDecoration: "none" }}>
            About
          </Link>
          <Link to="/privacy" style={{ color: ESPRESSO, textDecoration: "none" }}>
            Privacy
          </Link>
        </div>

        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          © {new Date().getFullYear()} Skintea. Got Skintea? Spill it.
        </div>
      </div>
    </footer>
  );
}
