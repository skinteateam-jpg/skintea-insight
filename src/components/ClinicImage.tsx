import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { DisplayImage } from "@/lib/clinicPhotos";

const WARM_WHITE = "#FFFCF8";
const MUTED = "#999999";
const PLACEHOLDER_BG = "#F5EFEC";

// Renders a clinic's images in a fixed box. The box size never depends on the image: wide and tall images are cropped
// to fill it (object-fit: cover), so layout is identical with a category image, one photo, several photos or none.
// Crops are anchored 30% from the top; images more than 2x taller or wider than the box are shown whole (contain).
// A failed load moves to the next image; if every image fails, the box shows "Photo unavailable".
export function ClinicImage({
  images,
  height,
  width = "100%",
  radius = 0,
  compact = false,
  showCount = false,
  children,
  index = 0,
  onFailed,
}: {
  images: DisplayImage[];
  height: number;
  width?: number | string;
  radius?: number;
  compact?: boolean;
  showCount?: boolean;
  children?: ReactNode;
  index?: number;
  onFailed?: (url: string) => void;
}) {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [fit, setFit] = useState<Record<string, "cover" | "contain">>({});
  useEffect(() => { setFailed(new Set()); }, [images.map((i) => i.url).join("|")]);

  const usable = images.filter((i) => !failed.has(i.url));
  const current = usable.length > 0 ? usable[Math.min(index, usable.length - 1)] : null;
  const isCategory = current?.kind === "category";
  const frame: CSSProperties = {
    position: "relative", width, height, flexShrink: 0, overflow: "hidden", borderRadius: radius, background: PLACEHOLDER_BG,
  };

  if (!current) {
    return (
      <div style={frame} data-clinic-image={images.length > 0 ? "failed" : "empty"}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 6, textAlign: "center" }}>
          <span style={{ fontSize: compact ? 9 : 11, fontWeight: 700, color: MUTED, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {images.length > 0 ? "Photo unavailable" : "Photo coming soon"}
          </span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div style={frame} data-clinic-image={current.kind}>
      <img
        key={current.url}
        src={current.url}
        alt={current.alt}
        loading="lazy"
        onError={() => { setFailed((prev) => new Set(prev).add(current.url)); onFailed?.(current.url); }}
        onLoad={(e) => {
          // An image more than twice as tall (or wide) as the box is shown whole on the placeholder ground instead of
          // cropped, so a very tall portrait never loses its face and a panorama keeps its subject.
          const img = e.currentTarget;
          const box = img.parentElement?.getBoundingClientRect();
          if (!box || !img.naturalWidth || !img.naturalHeight) return;
          const ratio = (img.naturalHeight / img.naturalWidth) / (box.height / box.width);
          const mode = ratio > 2 || ratio < 0.5 ? "contain" : "cover";
          if (fit[current.url] !== mode) setFit((prev) => ({ ...prev, [current.url]: mode }));
        }}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit[current.url] ?? "cover", objectPosition: "center 30%", display: "block" }}
      />
      {children}
      {isCategory && (
        <span
          style={{
            position: "absolute", left: compact ? 4 : 10, bottom: compact ? 4 : 10, maxWidth: compact ? "calc(100% - 8px)" : "70%",
            background: "rgba(28,10,0,0.78)", color: WARM_WHITE, borderRadius: 4, padding: compact ? "2px 4px" : "3px 8px",
            fontSize: compact ? 8 : 10, fontWeight: 700, lineHeight: 1.25, letterSpacing: "0.02em",
          }}
        >
          Photo coming soon
          {!compact && <span style={{ display: "block", fontSize: 8, fontWeight: 500, opacity: 0.8 }}>Illustrative image, not this clinic</span>}
        </span>
      )}
      {showCount && !isCategory && usable.filter((i) => i.kind === "clinic").length > 1 && (
        <span style={{ position: "absolute", right: compact ? 4 : 10, bottom: compact ? 4 : 10, background: "rgba(28,10,0,0.6)", color: WARM_WHITE, borderRadius: 999, padding: "2px 7px", fontSize: compact ? 8 : 10, fontWeight: 700 }}>
          1/{usable.filter((i) => i.kind === "clinic").length}
        </span>
      )}
    </div>
  );
}

