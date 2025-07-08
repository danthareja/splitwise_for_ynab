import { Heading, Section, Text } from "@react-email/components";
import { emailStyles } from "./email-styles";

interface HelpSectionProps {
  message?: string;
}

export const HelpSection = ({
  message = "We're here to help!",
}: HelpSectionProps) => {
  return (
    <Section style={emailStyles.section}>
      <Heading style={emailStyles.h3}>Need Support?</Heading>
      <Text style={emailStyles.text}>
        {message} Reply to this email, and we&apos;ll get back to you.
      </Text>
    </Section>
  );
};
