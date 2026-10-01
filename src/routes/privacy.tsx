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
    body: "When you create an account, we collect your email address and the name you sign up with, and any profile information you choose to add, such as a username, a profile photo and your skin type. Your sign-up name is never shown publicly. We also store the posts, reviews, comments, saves, likes and shelf or wishlist items you create. If you choose to post under your username, that post shows your username; if you post anonymously, nothing on the post links to your account.",
  },
  {
    title: "If You Use Skintea Without an Account",
    body: "You don't need an account to take the skin quiz or browse, but we still collect some information. Your browser is given a random session identifier, stored in your browser's local storage, and the information below is saved on our servers against that identifier. From the quiz: your answers, your skin type, your ZIP code if you enter one, your budget band, and whether you're interested in in-clinic treatments and which ones. While you browse: which clinic pages you view, and when you tap to call, book, get directions, or open a clinic's website or social profile. A single clinic page view stays in your browser and is saved only once you do something more. If you give us your email on your quiz result, we store it. You can separately tick a box letting matched clinics in the Los Angeles area contact you about a consultation; we record whether you ticked it, and you can untick it and submit again to withdraw. Clearing your browser's storage removes the identifier from your device. To have the information itself deleted, email hello@getskintea.com.",
  },
  {
    title: "Information Stored Only in Your Browser",
    body: "Some things are kept only in your browser's local storage and never sent to us: your last quiz result, your chosen skin type and age bracket, saved clinics and clinic filters if you are not signed in, and which Home skin type you last picked. Your location is never stored; if you share it to sort clinics by distance, it is used in your browser for that sort only.",
  },
  {
    title: "Information From Clinics",
    body: "Clinics can send us their details and photos through the For clinics page. We store what they submit, including the name of the person who submitted it, the written permission they give us to publish the photos, and, for before-and-after photos, their statement that every patient shown has authorized publication. Submitted photos are kept in private storage until we review them.",
  },
  {
    title: "How We Use Your Information",
    body: "We use your information to run your account, show your quiz result and fit summary, match products, treatments and clinics to your skin profile, show posts and reviews, keep the community safe, and improve Skintea. We count anonymous taps on clinic listings (calls, bookings, directions, websites) to understand which clinics people are interested in. We do not use your personal data to make automated decisions that have legal or similarly significant effects on you.",
  },
  {
    title: "Information Sharing",
    body: "We do not sell personal information, and we do not share it for cross-context behavioral advertising. When you ask us to connect you with a specific clinic, we share the contact details that clinic needs to respond to you, only with that clinic and at your request. Anything else we share with clinics or brands is aggregated statistics that cannot identify you. We rely on service providers to run Skintea, including our hosting and database providers; they process data on our behalf.",
  },
  {
    title: "Third-Party Content and Requests",
    body: "Pages load fonts from Google Fonts and map tiles from OpenStreetMap-based tile servers, which means your browser sends your IP address to those providers. Embedded or linked videos from TikTok and Instagram are served by those platforms under their own privacy policies. Links to retailers and clinics take you to their sites, which have their own policies. We do not use advertising or analytics trackers.",
  },
  {
    title: "Your Rights, Including California Rights",
    body: "You can update your profile from your profile page and delete your own posts at any time. To delete your account and the data tied to it, request a copy of your data, or correct it, email hello@getskintea.com from the address on your account; we will confirm and complete the request within 45 days. California residents have the right to know, delete, correct, and opt out of the sale or sharing of personal information, and to not be discriminated against for using these rights. We do not sell or share personal information, so there is nothing to opt out of; you can still contact us to exercise any of these rights.",
  },
  {
    title: "Cookies and Local Storage",
    body: "We use your browser's local storage and a sign-in cookie to keep you signed in and remember the settings described above. We do not use advertising or analytics cookies. You can clear them through your browser settings; signing in and some saved settings will stop working until you do them again.",
  },
  {
    title: "Data Retention",
    body: "We keep account data while your account exists and delete it when you ask us to delete your account, except where we must keep something to meet a legal obligation. Quiz and browsing data tied only to a session identifier is kept until you ask us to delete it.",
  },
  {
    title: "Data Security",
    body: "We take reasonable technical and organizational measures to protect your information, including encryption in transit and access controls on our database. No system is completely secure, and we encourage you to use a strong password and keep your login private.",
  },
  {
    title: "Children's Privacy",
    body: "Skintea is not intended for users under 18. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, contact us and we will delete it.",
  },
  {
    title: "Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. When we make material changes, we will update the date at the top of this page and, where appropriate, tell you through the site or by email.",
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
          Last updated: October 2026
        </div>

        <div style={{ fontSize: 13, color: ESPRESSO, lineHeight: 1.6, marginBottom: 28, padding: "12px 14px", border: `0.5px solid ${BORDER}`, borderRadius: 10, background: WARM_WHITE }}>
          <strong>What changed in October 2026:</strong> we now list everything we collect, including what clinics submit and what stays only in your browser; we removed a line about analytics cookies (we use none); account deletion is by email until there is a delete button; and we added a California rights section.</div>

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
