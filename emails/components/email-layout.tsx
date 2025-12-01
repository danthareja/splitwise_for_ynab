import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { ReactNode } from "react";
import { colors } from "./email-styles";

interface EmailLayoutProps {
  children: ReactNode;
  previewText: string;
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const EmailLayout = ({ children, previewText }: EmailLayoutProps) => {
  return (
    <Html>
      <Head>
        {/* Include DM Sans and Instrument Serif fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Instrument+Serif&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo/Brand header */}
          <Section style={header}>
            <Text style={brandText}>Splitwise for YNAB</Text>
          </Section>

          {/* Content */}
          {children}
        </Container>
      </Body>
    </Html>
  );
};

// Warm cream background like the app
const main = {
  backgroundColor: colors.background,
  fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "40px 24px",
  maxWidth: "560px",
};

const header = {
  marginBottom: "32px",
};

const brandText = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontSize: "20px",
  fontWeight: "400",
  color: colors.foreground,
  margin: "0",
};

export { baseUrl };
