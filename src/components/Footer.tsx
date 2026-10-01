import { Link } from "@tanstack/react-router";

const ESPRESSO = "#1C0A00";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

// Site-wide footer. `navSpacer` leaves room for the fixed bottom nav on pages that have one.
export default function Footer({ navSpacer = false }: { navSpacer?: boolean }) {
  return (
    <footer
      style={{
        borderTop: `0.5px solid ${BORDER}`,
        padding: navSpacer ? "24px 16px 104px" : "24px 16px",
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
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px", fontSize: 13, fontWeight: 600 }}>
          <Link to="/about" style={{ color: ESPRESSO, textDecoration: "none" }}>
            About
          </Link>
          <Link to="/privacy" style={{ color: ESPRESSO, textDecoration: "none" }}>
            Privacy
          </Link>
          <Link to="/terms" style={{ color: ESPRESSO, textDecoration: "none" }}>
            Terms
          </Link>
          <Link to="/disclosure" style={{ color: ESPRESSO, textDecoration: "none" }}>
            Disclosure
          </Link>
          <Link to="/for-clinics" style={{ color: ESPRESSO, textDecoration: "none" }}>
            For clinics
          </Link>
        </div>

        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
          Skintea shares what people say about products, treatments and clinics. It is not medical advice. Talk to a
          licensed provider before any treatment or procedure.
        </p>

        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          © {new Date().getFullYear()} Skintea. Got Skintea? Spill it.
        </div>
      </div>
    </footer>
  );
}
