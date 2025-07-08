import { Body, Container, Head, Html, Preview } from "@react-email/components";
import { ReactNode } from "react";

interface EmailLayoutProps {
  children: ReactNode;
  previewText: string;
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const EmailLayout = ({ children, previewText }: EmailLayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>{children}</Container>
      </Body>
    </Html>
  );
};

// Shared styles - Stripe-inspired minimal design
const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "600px",
};

export { baseUrl };
