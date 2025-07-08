import { Heading, Section, Text } from "@react-email/components";
import { emailStyles } from "./email-styles";
import { ReactNode } from "react";

interface ContentBoxProps {
  children: ReactNode;
  title?: string;
  variant?: "default" | "error" | "action" | "warning";
}

export const ContentBox = ({
  children,
  title,
  variant = "default",
}: ContentBoxProps) => {
  const getTextStyle = () => {
    switch (variant) {
      case "error":
        return emailStyles.errorText;
      case "action":
        return emailStyles.actionText;
      case "warning":
        return emailStyles.warningText;
      default:
        return emailStyles.text;
    }
  };

  return (
    <Section style={emailStyles.contentBox}>
      {title && <Heading style={emailStyles.h3}>{title}</Heading>}
      {typeof children === "string" ? (
        <Text style={getTextStyle()}>{children}</Text>
      ) : (
        children
      )}
    </Section>
  );
};
