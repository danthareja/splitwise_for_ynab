import { Section, Text, Link } from "@react-email/components";
import { emailStyles, colors } from "./email-styles";
import { baseUrl } from "./email-layout";

interface HelpSectionProps {
  showHelpLink?: boolean;
}

export const HelpSection = ({ showHelpLink = true }: HelpSectionProps) => {
  return (
    <Section style={container}>
      <Text style={text}>
        Questions? Just reply to this email.
        {showHelpLink && (
          <>
            {" "}
            Or visit our{" "}
            <Link href={`${baseUrl}/dashboard/help`} style={emailStyles.link}>
              help center
            </Link>
            .
          </>
        )}
      </Text>
    </Section>
  );
};

const container = {
  marginTop: "24px",
};

const text = {
  ...emailStyles.textSmall,
  color: "#9ca3af",
};
