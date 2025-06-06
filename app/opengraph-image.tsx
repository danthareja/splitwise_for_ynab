import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Splitwise for YNAB - Automate your shared expenses";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

// Image generation
export default async function OpengraphImage() {
  // Get the base URL for the images
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://splitwiseforynab.com";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to bottom right, #dbeafe, #fafafa)",
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        {/* Main title section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <div style={{ fontSize: 72, fontWeight: "bold", color: "#1f2937" }}>
            Splitwise for YNAB
          </div>
        </div>

        {/* Logo section */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
            gap: 40,
          }}
        >
          {/* Splitwise Logo */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <img
              src={`${baseUrl}/images/splitwise-logo.png`}
              width="80"
              height="80"
              alt="Splitwise"
              style={{
                borderRadius: "12px",
              }}
            />
            <div
              style={{
                background: "#16a085",
                color: "white",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              Splitwise
            </div>
          </div>

          {/* Plus sign */}
          <div
            style={{
              fontSize: 48,
              fontWeight: "bold",
              color: "#6b7280",
              margin: "0 20px",
            }}
          >
            +
          </div>

          {/* YNAB Logo */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <img
              src={`${baseUrl}/images/ynab-logo.png`}
              width="80"
              height="80"
              alt="YNAB"
              style={{
                borderRadius: "12px",
              }}
            />
            <div
              style={{
                background: "#2563eb",
                color: "white",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: 18,
                fontWeight: "bold",
              }}
            >
              YNAB
            </div>
          </div>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 36,
            color: "#4b5563",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          Automate your shared expenses
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "#6b7280",
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Stop manual data entry • Perfect category tracking
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
