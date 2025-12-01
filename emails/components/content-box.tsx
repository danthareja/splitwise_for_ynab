import { Heading, Section, Text } from "@react-email/components";
import { emailStyles } from "./email-styles";
import { ReactNode } from "react";

interface ContentBoxProps {
  children: ReactNode;
  title?: string;
  variant?: "default" | "highlight" | "success" | "error" | "warning";
}

export const ContentBox = ({
  children,
  title,
  variant = "default",
}: ContentBoxProps) => {
  const getBoxStyle = () => {
    switch (variant) {
      case "highlight":
        return emailStyles.highlightBox;
      case "success":
        return emailStyles.successBox;
      case "error":
        return emailStyles.errorBox;
      case "warning":
        return emailStyles.highlightBox; // Use amber for warnings too
      default:
        return emailStyles.contentBox;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "error":
        return emailStyles.errorText;
      case "success":
        return emailStyles.successText;
      case "warning":
        return emailStyles.warningText;
      default:
        return emailStyles.text;
    }
  };

  return (
    <Section style={getBoxStyle()}>
      {title && <Heading style={emailStyles.h3}>{title}</Heading>}
      {typeof children === "string" ? (
        <Text style={{ ...getTextStyle(), margin: 0 }}>{children}</Text>
      ) : (
        children
      )}
    </Section>
  );
};
