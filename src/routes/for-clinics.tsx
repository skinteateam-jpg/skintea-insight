import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/for-clinics")({
  head: () => ({
    meta: [
      { title: "Send your clinic's photos and details — Skintea" },
      {
        name: "description",
        content:
          "Clinics: send Skintea your photos and listing details, with your permission to display them.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForClinicsPage,
});

const ESPRESSO = "#1C0A00";
const CRIMSON = "#A8001C";
const WARM_WHITE = "#FFFCF8";
const BORDER = "#E8DDD4";
const MUTED = "#999999";

const MAX_FILES = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

// Stored verbatim with every submission, together with its version, the typed name and the server's timestamp.
const PERMISSION_VERSION = "2026-09-14.v1";
// Shown only when a photo is tagged Results. Ticking it records results_patient_authorization_at with the submission; the
// insert policy rejects any NN-results-* photo without it, and no Results photo is copied into clinics.photos without it.
const RESULTS_AUTHORIZATION =
  "Every patient shown in a Results photo has given written authorization for these photos to be published on Skintea. " +
  "We keep that authorization and will provide it if asked.";
function permissionText(clinic: string) {
  const who = clinic.trim() || "the clinic named above";
  return (
    `I confirm that I am authorised to act for ${who}, and that ${who} owns the photos I am sending or has the right to license them. ` +
    `I give Skintea permission to display these photos, and the details in this form, on ${who}'s listing on the Skintea website and app, ` +
    `resized or cropped to fit. This permission starts today and continues until ${who} withdraws it by emailing hello@getskintea.com; ` +
    `Skintea will then remove the photos from the listing.`
  );
}

// Photo categories match the clinic page's photo sections (clinics.photos entries carry `section`). outside, interior,
// results and staff fill the header gallery; parking renders only inside the Parking section.
const PHOTO_CATEGORIES = [
  { key: "outside", label: "Outside", hint: "The building and the entrance from the street." },
  { key: "interior", label: "Interior", hint: "Reception and treatment rooms." },
  { key: "results", label: "Results", hint: "Your own patients' before and after photos." },
  { key: "staff", label: "Staff", hint: "Your team." },
  { key: "parking", label: "Parking", hint: "Where to park and the way in from the lot." },
] as const;
type PhotoCategory = (typeof PHOTO_CATEGORIES)[number]["key"];

// The category travels in the stored file name, e.g. "01-parking-lot.jpg". The intake policies accept only
// pending/<id>/<2 digits>-<[a-z0-9._-]{1,80}> (no subfolders, no extra column), so the name is the only place it can go
// without a schema change. A reviewer copying a photo into clinics.photos reads the word after the number as `section`.
function safeName(file: File, i: number, category: PhotoCategory) {
  const ext =
    (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 5) || "jpg";
  const base =
    file.name
      .replace(/\.[^.]*$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "photo";
  return `${String(i + 1).padStart(2, "0")}-${category}-${base}.${ext}`;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          color: ESPRESSO,
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ display: "block", fontSize: 10, color: MUTED, marginTop: 3 }}>{hint}</span>
      )}
    </label>
  );
}

const input: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "9px 10px",
  fontSize: 13,
  color: ESPRESSO,
  background: "#fff",
};

function ForClinicsPage() {
  const [form, setForm] = useState({
    clinic_name: "",
    submitter_name: "",
    submitter_role: "",
    submitter_email: "",
    phone: "",
    website_url: "",
    address: "",
    hours_text: "",
    message: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  // One category per selected photo, by index; "" until the sender chooses. Every photo needs one before sending.
  const [categories, setCategories] = useState<(PhotoCategory | "")[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [resultsAuthorized, setResultsAuthorized] = useState(false);
  const [signed, setSigned] = useState("");
  const [state, setState] = useState<{
    kind: "idle" | "sending" | "done" | "error";
    message?: string;
    ref?: string;
  }>({ kind: "idle" });
  const statement = useMemo(() => permissionText(form.clinic_name), [form.clinic_name]);
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const fileProblem =
    files.length > MAX_FILES
      ? `Up to ${MAX_FILES} photos.`
      : files.find((f) => f.size > MAX_BYTES)
        ? "Each photo must be under 10 MB."
        : files.find((f) => !ACCEPTED.includes(f.type))
          ? "Photos must be JPEG, PNG, WebP or HEIC."
          : categories.some((c) => c === "")
            ? "Choose a category for each photo."
            : null;
  const hasResults = categories.includes("results");
  const ready =
    form.clinic_name.trim().length >= 2 &&
    form.submitter_name.trim().length >= 2 &&
    form.submitter_role.trim().length >= 2 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.submitter_email.trim()) &&
    (!form.website_url || /^https?:\/\//i.test(form.website_url.trim())) &&
    agreed &&
    signed.trim().length >= 2 &&
    !fileProblem &&
    (!hasResults || resultsAuthorized) &&
    state.kind !== "sending";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setState({ kind: "sending" });
    const id = crypto.randomUUID();
    const paths: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const path = `pending/${id}/${safeName(files[i], i, categories[i] as PhotoCategory)}`;
        const { error } = await supabase.storage
          .from("clinic-submissions")
          .upload(path, files[i], { contentType: files[i].type, upsert: false });
        if (error) throw new Error(`Photo ${i + 1} did not upload: ${error.message}`);
        paths.push(path);
      }
      const clean = (v: string) => (v.trim() ? v.trim() : null);
      const { error } = await supabase.from("clinic_submissions" as any).insert({
        id,
        clinic_name: form.clinic_name.trim(),
        submitter_name: form.submitter_name.trim(),
        submitter_role: form.submitter_role.trim(),
        submitter_email: form.submitter_email.trim(),
        phone: clean(form.phone),
        website_url: clean(form.website_url),
        address: clean(form.address),
        hours_text: clean(form.hours_text),
        message: clean(form.message),
        photo_paths: paths,
        permission_granted: true,
        permission_statement: statement,
        permission_statement_version: PERMISSION_VERSION,
        permission_signed_name: signed.trim(),
        results_patient_authorization_at:
          hasResults && resultsAuthorized ? new Date().toISOString() : null,
      } as any);
      if (error) throw new Error(error.message);
      setState({ kind: "done", ref: id.slice(0, 8) });
    } catch (err: any) {
      setState({
        kind: "error",
        message: err?.message ?? "Something went wrong. Nothing was sent.",
      });
    }
  }

  if (state.kind === "done") {
    return (
      <div
        style={{
          background: WARM_WHITE,
          minHeight: "100vh",
          padding: "40px 20px",
          color: ESPRESSO,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Received — thank you</div>
          <p style={{ fontSize: 13, lineHeight: 1.6 }}>
            Skintea has your details
            {files.length ? ` and ${files.length} photo${files.length === 1 ? "" : "s"}` : ""}, with
            your written permission recorded at the time you sent them. Nothing appears on your
            listing until we have reviewed it. Reference: <strong>{state.ref}</strong>.
          </p>
          <p style={{ fontSize: 12, color: MUTED }}>
            To withdraw permission at any time, email hello@getskintea.com with this reference.
          </p>
          <Link to="/clinics" style={{ color: CRIMSON, fontSize: 13, fontWeight: 700 }}>
            Back to clinics
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: WARM_WHITE,
        minHeight: "100vh",
        padding: "28px 20px 60px",
        color: ESPRESSO,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <form onSubmit={submit} style={{ maxWidth: 520, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: CRIMSON,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          For clinics
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 8px" }}>
          Send your photos and listing details
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: ESPRESSO, marginBottom: 20 }}>
          Skintea shows your own photos on your listing only with your written permission. Send them
          here with your details; we review everything before it appears.
        </p>

        <Field label="Clinic name *">
          <input
            style={input}
            value={form.clinic_name}
            onChange={set("clinic_name")}
            maxLength={200}
            required
          />
        </Field>
        <Field label="Your name *">
          <input
            style={input}
            value={form.submitter_name}
            onChange={set("submitter_name")}
            maxLength={120}
            required
          />
        </Field>
        <Field
          label="Your role at the clinic *"
          hint="For example: owner, practice manager, marketing lead"
        >
          <input
            style={input}
            value={form.submitter_role}
            onChange={set("submitter_role")}
            maxLength={120}
            required
          />
        </Field>
        <Field label="Work email *">
          <input
            style={input}
            type="email"
            value={form.submitter_email}
            onChange={set("submitter_email")}
            maxLength={254}
            required
          />
        </Field>
        <Field label="Clinic phone">
          <input style={input} value={form.phone} onChange={set("phone")} maxLength={40} />
        </Field>
        <Field label="Website" hint="Starting with https://">
          <input
            style={input}
            value={form.website_url}
            onChange={set("website_url")}
            maxLength={500}
          />
        </Field>
        <Field label="Address">
          <input style={input} value={form.address} onChange={set("address")} maxLength={300} />
        </Field>
        <Field label="Opening hours">
          <textarea
            style={{ ...input, minHeight: 60 }}
            value={form.hours_text}
            onChange={set("hours_text")}
            maxLength={1000}
          />
        </Field>
        <Field label="Anything else">
          <textarea
            style={{ ...input, minHeight: 60 }}
            value={form.message}
            onChange={set("message")}
            maxLength={2000}
          />
        </Field>

        <Field
          label={`Photos (up to ${MAX_FILES}, 10 MB each)`}
          hint="Choose a category for each photo below. JPEG, PNG, WebP or HEIC."
        >
          <input
            type="file"
            accept={ACCEPTED.join(",")}
            multiple
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              setFiles(picked);
              setCategories(picked.map(() => ""));
            }}
            style={{ fontSize: 12 }}
          />
        </Field>
        {files.length > 0 && files.length <= MAX_FILES && (
          <div
            data-photo-categories
            style={{ display: "flex", flexDirection: "column", gap: 10, margin: "-4px 0 14px" }}
          >
            {files.map((f, i) => {
              const chosen = PHOTO_CATEGORIES.find((c) => c.key === categories[i]);
              return (
                <div
                  key={`${i}-${f.name}`}
                  style={{
                    border: `1px solid ${BORDER}`,
                    background: "#fff",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: ESPRESSO,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginBottom: 6,
                    }}
                  >
                    {f.name}
                  </div>
                  <div
                    role="radiogroup"
                    aria-label={`Category for ${f.name}`}
                    style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                  >
                    {PHOTO_CATEGORIES.map((c) => {
                      const on = categories[i] === c.key;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          data-category={c.key}
                          onClick={() =>
                            setCategories((prev) => prev.map((v, j) => (j === i ? c.key : v)))
                          }
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "5px 10px",
                            borderRadius: 20,
                            cursor: "pointer",
                            border: `1px solid ${on ? CRIMSON : BORDER}`,
                            background: on ? CRIMSON : "#fff",
                            color: on ? WARM_WHITE : ESPRESSO,
                          }}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 5 }}>
                    {chosen ? chosen.hint : "Choose a category."}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {files.length > 0 && (
          <div
            style={{ fontSize: 11, color: fileProblem ? CRIMSON : MUTED, margin: "-8px 0 14px" }}
          >
            {fileProblem ?? `${files.length} photo${files.length === 1 ? "" : "s"} selected`}
          </div>
        )}

        <div
          style={{
            border: `1px solid ${BORDER}`,
            background: "#fff",
            borderRadius: 10,
            padding: 14,
            margin: "8px 0 16px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Permission
          </div>
          <p
            data-permission-statement
            style={{ fontSize: 12, lineHeight: 1.6, margin: "0 0 12px" }}
          >
            {statement}
          </p>
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              fontSize: 12,
              marginBottom: 12,
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>I agree to the statement above.</span>
          </label>
          <Field label="Type your full name to sign *">
            <input
              style={input}
              value={signed}
              onChange={(e) => setSigned(e.target.value)}
              maxLength={120}
            />
          </Field>
          <div style={{ fontSize: 10, color: MUTED }}>
            The statement, your typed name and the time you send this form are stored with your
            submission.
          </div>
        </div>

        {hasResults && (
          <div
            data-results-authorization
            style={{
              border: `1px solid ${BORDER}`,
              background: "#fff",
              borderRadius: 10,
              padding: 14,
              margin: "0 0 16px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Results photos *
            </div>
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <input
                type="checkbox"
                checked={resultsAuthorized}
                onChange={(e) => setResultsAuthorized(e.target.checked)}
                style={{ marginTop: 4 }}
              />
              <span>{RESULTS_AUTHORIZATION}</span>
            </label>
          </div>
        )}

        {state.kind === "error" && (
          <div style={{ color: CRIMSON, fontSize: 12, marginBottom: 12 }}>{state.message}</div>
        )}
        <button
          type="submit"
          disabled={!ready}
          style={{
            width: "100%",
            background: ready ? CRIMSON : "#D9C9C0",
            color: WARM_WHITE,
            border: "none",
            borderRadius: 10,
            padding: "12px 0",
            fontSize: 14,
            fontWeight: 800,
            cursor: ready ? "pointer" : "not-allowed",
          }}
        >
          {state.kind === "sending" ? "Sending…" : "Send to Skintea"}
        </button>
      </form>
    </div>
  );
}
