import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  userName?: string;
  userEmail: string;
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const WelcomeEmail = ({
  userName = "there",
  userEmail,
}: WelcomeEmailProps) => {
  const previewText = `Welcome to Splitwise for YNAB!`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Splitwise for YNAB! 🎉</Heading>
          
          <Text style={text}>Hi {userName},</Text>
          
          <Text style={text}>
            Thank you for connecting your Splitwise account! You're all set to start syncing your shared expenses with YNAB.
          </Text>

          <Section style={section}>
            <Heading style={h2}>Getting Started</Heading>
            
            <Text style={text}>
              <strong>1. Configure Your Sync Settings</strong><br />
              Visit your dashboard to set up which Splitwise group you want to sync with YNAB.
            </Text>
            
            <Text style={text}>
              <strong>2. Choose Your YNAB Account</strong><br />
              Select which YNAB account should receive your Splitwise transactions.
            </Text>
            
            <Text style={text}>
              <strong>3. Set Up Automatic Sync</strong><br />
              Enable automatic syncing to keep your expenses up-to-date without manual intervention.
            </Text>
          </Section>

          <Section style={buttonSection}>
            <Button
              style={button}
              href={`${baseUrl}/dashboard`}
            >
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={section}>
            <Heading style={h2}>How It Works</Heading>
            
            <Text style={text}>
              • <strong>Splitwise → YNAB:</strong> Your share of expenses from Splitwise will be imported as transactions in YNAB
            </Text>
            
            <Text style={text}>
              • <strong>YNAB → Splitwise:</strong> Transactions with your sync emoji (default: ✅) will be created as expenses in Splitwise
            </Text>
            
            <Text style={text}>
              • <strong>Smart Matching:</strong> We prevent duplicate transactions by matching dates and amounts
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={section}>
            <Heading style={h2}>Need Help?</Heading>
            
            <Text style={text}>
              Check out our <Link href={`${baseUrl}/help`} style={link}>help documentation</Link> or reply to this email if you have any questions.
            </Text>
            
            <Text style={text}>
              We're here to help make expense sharing with YNAB as smooth as possible!
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This email was sent to {userEmail} because you connected your Splitwise account to Splitwise for YNAB.
          </Text>
          
          <Text style={footer}>
            <Link href={`${baseUrl}/settings`} style={link}>
              Manage email preferences
            </Link>
            {" · "}
            <Link href={`${baseUrl}/privacy`} style={link}>
              Privacy Policy
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

WelcomeEmail.PreviewProps = {
  userName: "John",
  userEmail: "john@example.com",
} as WelcomeEmailProps;

export default WelcomeEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "40px",
  margin: "30px 0",
  padding: "0 20px",
  textAlign: "center" as const,
};

const h2 = {
  color: "#333",
  fontSize: "20px",
  fontWeight: "600",
  lineHeight: "28px",
  margin: "25px 0 15px",
  padding: "0",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
};

const section = {
  padding: "0 20px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#5469d4",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const link = {
  color: "#5469d4",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "40px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "16px 0",
  textAlign: "center" as const,
  padding: "0 20px",
};