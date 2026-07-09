import { createFileRoute, Link } from "@tanstack/react-router";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Skintea" },
      { name: "description", content: "Why Skintea exists: real experiences, honest numbers, no gatekeeping." },
    ],
  }),
  component: AboutPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const CREAM = "#FFFCF8";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

function AboutPage() {
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
            marginBottom: 24,
          }}
        >
          Why Skintea Exists
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
            When I see a pretty girl — or a celebrity with insane skin — I want to know everything. What she puts on her face. How she does her makeup. What she's actually using, not what she says she's using.
          </p>

          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
            And some of it is gatekept. Treatments. Procedures. The real routine behind the "I just drink water and sleep 8 hours" answer.
          </p>

          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
            Here's the thing: no one is that pretty by accident. Genetics get you a starting point — the rest is effort, money, and information most people don't share. So why do we let each other believe it's just genetic? Why is asking "what did you get done" still awkward?
          </p>

          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
            I don't think it should be. Girls should be able to tell girls what worked, what didn't, what was worth it and what wasn't. That's not vanity — that's just information, and keeping each other out of it doesn't protect anyone. It's 2026. Anyone can look however they want, try any style, any look — a "type" you've never touched included. That's the fun part. Trying, sharing, getting prettier together should feel like a privilege, not a secret.
          </p>

          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
            The problem is beauty information is everywhere and nowhere. TikTok, Reddit, fifteen beauty accounts, none of them agree, all of them filtered. I didn't want fifteen sources. I wanted one place with the real answer — what actually worked, what didn't, and for who.
          </p>

          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
            That's Skintea. Real experiences from TikTok, Reddit, and reviews, structured into one honest answer: majority opinion, minority opinion, and the treatments people usually keep quiet about.
          </p>

          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: 0 }}>
            No gatekeeping. No pretending it's genetic. Just the tea.
          </p>

          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, fontStyle: "italic", margin: "6px 0 0" }}>
            This isn't me telling you what to use. It's every girl who tried it before you, put in one place.
          </p>

          <p style={{ fontSize: 15, color: ESPRESSO, lineHeight: 1.7, margin: "8px 0 0" }}>
            Founded by Chinami Akada.
          </p>
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
          Got a question or want to say hi? Reach us at{" "}
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
