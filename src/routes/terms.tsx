import { createFileRoute, Link } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Skintea" },
      { name: "description", content: "The terms for using Skintea, posting on it, and listing a clinic." },
    ],
  }),
  component: TermsPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FFFCF8";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

// DRAFT for Chi's review (2026-10-01). Not legal advice; have it reviewed before Skintea publishes.
const SECTIONS = [
  {
    title: "Using Skintea",
    body: "Skintea collects what people say about skincare products, treatments and clinics and organizes it by skin type. By using the site you agree to these terms and to our Privacy Policy. You must be 18 or older to create an account or post.",
  },
  {
    title: "Not Medical Advice",
    body: "Nothing on Skintea is medical advice, a diagnosis or a recommendation to have any treatment or procedure. Reviews, posts, percentages and quotes describe other people's experiences. Talk to a licensed provider before starting any product, treatment or procedure, and in an emergency call 911.",
  },
  {
    title: "Where Our Content Comes From",
    body: "Opinions shown on product and treatment pages are quoted from public posts on Reddit, TikTok and Instagram, with a link to each source, and from posts written on Skintea. We label how each figure was counted and how many reviews it is based on. Clinic details come from the clinic's own website, from the clinic itself, or from public listings, as noted on each page. We work to keep it accurate but cannot guarantee that any listing, price or opening time is current; check with the clinic before you go.",
  },
  {
    title: "Your Account",
    body: "Keep your login private; you are responsible for activity on your account. You can choose a username. Posts in Treatment Talk and Surgery Talk can be posted under your username or anonymously, and you can delete your own posts at any time.",
  },
  {
    title: "What You Post",
    body: "Post only your own honest experience. Do not post anything false or misleading, anything you were paid or given products for without saying so, someone else's photos or personal information, photos of other people without their permission, harassment, hate, or anything illegal. Clinics and anyone paid by a clinic may not write reviews or tea about that clinic. We may remove posts or suspend accounts that break these rules.",
  },
  {
    title: "Rights in Your Posts",
    body: "You keep ownership of what you post. You give Skintea a non-exclusive, royalty-free, worldwide license to host, display, and show your post on Skintea and to count it in aggregate figures, for as long as it stays on the site. Deleting a post ends that license, except for counts already published in aggregate.",
  },
  {
    title: "Clinics",
    body: "A clinic that submits details or photos through the For clinics page confirms that it has the right to share them and, for before-and-after photos, that every patient shown has given written authorization for publication on Skintea. Clinics cannot pay to change their position, ratings or reviews. Clinic replies, when available, are labelled as coming from the clinic.",
  },
  {
    title: "Links and Shopping",
    body: "Skintea links to retailers, clinics and social platforms. Some retailer links may earn Skintea a commission; see our Disclosure page. A commission never changes a product's figures or ranking. We are not responsible for third-party sites, their prices or their products.",
  },
  {
    title: "Disclaimers and Limits",
    body: "Skintea is provided as is. To the extent the law allows, Skintea is not liable for indirect or consequential losses, or for any decision you make based on content on the site. Nothing in these terms limits rights you have under law that cannot be waived.",
  },
  {
    title: "Changes and Contact",
    body: "We may update these terms; the date at the top shows the latest version, and material changes will be announced on the site. These terms are governed by the laws of the State of California. Questions: hello@getskintea.com.",
  },
];

function TermsPage() {
  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header
        style={{
          background: WARM_WHITE,
          borderBottom: `1px solid ${BORDER}`,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "14px 16px" }}>
          <Link to="/" style={{ textDecoration: "none", display: "inline-block", lineHeight: 1 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: ESPRESSO }}>Skin</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontWeight: 700, fontSize: 22, color: CRIMSON }}>tea</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 28,
            color: ESPRESSO,
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          Terms of Use
        </h1>

        <div style={{ fontSize: 12, color: MUTED, marginBottom: 28 }}>
          Last updated: October 2026
        </div>



        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: ESPRESSO,
                  marginBottom: 8,
                  marginTop: 0,
                }}
              >
                {section.title}
              </h2>
              <p style={{ fontSize: 14, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: `0.5px solid ${BORDER}`,
            fontSize: 13,
            color: MUTED,
            lineHeight: 1.6,
          }}
        >
          Questions? Contact us at{" "}
          <a href="mailto:hello@getskintea.com" style={{ color: CRIMSON, textDecoration: "none", fontWeight: 600 }}>
            hello@getskintea.com
          </a>
          .
        </div>
      </main>

      <Footer navSpacer />
      <BottomNav />
    </div>
  );
}
