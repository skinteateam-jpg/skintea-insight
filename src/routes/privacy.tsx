import { createFileRoute, Link } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Skintea" },
      { name: "description", content: "Skintea's privacy policy: how we collect, use, and protect your information." },
    ],
  }),
  component: PrivacyPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FFFCF8";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

const SECTIONS = [
  {
    title: "Information We Collect",
    body: "When you create an account, we collect your email address, username, and any profile information you choose to provide. Your skin profile — including skin type, concerns, and preferences — helps us match you to products, treatments, and clinics. We also collect the reviews, tea posts, and comments you submit, plus usage data such as pages visited, device type, and cookies that help us improve the platform.",
  },
  {
    title: "If You Use Skintea Without an Account",
    body: "You don't need an account to take the skin quiz or browse clinics, but we still collect some information when you do. Your browser is given a random session identifier, stored in your browser's local storage, and the information below is saved on our servers against that identifier. From the quiz: your answers, your skin type, your ZIP code if you enter one, your budget band, and whether you're interested in in-clinic treatments and which ones. While you browse: which clinic pages you view and when you click to book a consultation or visit a clinic's booking link. A single clinic page view stays in your browser and is saved only once you do something more, such as viewing a second clinic, finishing the quiz, clicking to book, or giving us your email. If you give us your email on your quiz result, we store it. Separately, you can tick a box letting matched clinics near you contact you about a consultation; we record whether you ticked it, and you can untick it and submit again to withdraw. We use this to show your result, show clinics near you, understand which clinics and treatments people are interested in, email you about treatments and clinics near you, and, if you ask us to, connect you with a clinic (see Information Sharing). Clearing your browser's storage removes the identifier from your device. To have the information itself deleted, email hello@getskintea.com.",
  },
  {
    title: "How We Use Your Information",
    body: "We use your information to personalize your Skintea experience, match products and clinics to your skin profile, rank and surface honest reviews, and improve the service. We may use anonymized and aggregated data to identify trends and share insights with the broader community, but we do not use your personal data to make automated decisions that affect you.",
  },
  {
    title: "Information Sharing",
    body: "We do not sell personal information, and we do not share it with advertisers or data brokers. When you ask us to connect you with a specific clinic, we share the contact details that clinic needs in order to respond to you. We do this at your request, only with that clinic, and we tell you before we do it. Apart from that, anything we share with clinics or brands is aggregated statistics that cannot identify you. We also rely on service providers, such as our hosting and database providers, to operate Skintea; they process data on our behalf and are contractually bound to protect it.",
  },
  {
    title: "User Rights",
    body: "You can access, update, or delete your account and skin profile at any time from your account settings. If you want to delete all your submitted reviews and tea posts, or request a copy of your data, contact us at hello@getskintea.com and we will process your request within a reasonable timeframe.",
  },
  {
    title: "Cookies and Tracking",
    body: "We use cookies and similar technologies to keep you signed in, understand how the platform is used, and make improvements. You can control cookies through your browser settings, though disabling cookies may affect some features of Skintea.",
  },
  {
    title: "Data Security",
    body: "We take reasonable technical and organizational measures to protect your information, including encryption in transit and access controls. No system is completely secure, and we encourage you to use a strong password and keep your login credentials private.",
  },
  {
    title: "Children's Privacy",
    body: "Skintea is not intended for users under 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us and we will delete it.",
  },
  {
    title: "Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. When we make material changes, we will update the 'Last updated' date at the top of this page and, where appropriate, notify you through the platform or by email.",
  },
  {
    title: "Contact",
    body: "If you have questions about this Privacy Policy or how we handle your data, email us at hello@getskintea.com.",
  },
];

function PrivacyPage() {
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
          Privacy Policy
        </h1>

        <div style={{ fontSize: 12, color: MUTED, marginBottom: 28 }}>
          Last updated: September 2026
        </div>

        <div style={{ fontSize: 13, color: ESPRESSO, lineHeight: 1.6, marginBottom: 28, padding: "12px 14px", border: `0.5px solid ${BORDER}`, borderRadius: 10, background: WARM_WHITE }}>
          <strong>What changed in September 2026:</strong> we added a section on what we collect when you use Skintea without an account, and we made our sharing statement specific. We do not sell personal information or share it with advertisers or data brokers; when you ask us to connect you with a specific clinic, we share the contact details that clinic needs, only with that clinic and at your request. We removed an earlier line saying that information was stored only with our hosting and database providers, because connecting you with a clinic you ask for means sharing your contact details with that clinic.
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

      <Footer />
      <BottomNav />
    </div>
  );
}
