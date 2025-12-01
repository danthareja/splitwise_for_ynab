import { Hr, Link, Text } from "@react-email/components";
import { emailStyles, colors } from "./email-styles";
import { baseUrl } from "./email-layout";

interface EmailFooterProps {
  reason: string;
}

export const EmailFooter = ({ reason }: EmailFooterProps) => {
  return (
    <>
      <Hr style={emailStyles.hr} />

      <Text style={emailStyles.footer}>You received this email {reason}.</Text>

      <Text style={emailStyles.footer}>
        <Link href={`${baseUrl}/privacy`} style={footerLink}>
          Privacy Policy
        </Link>
        {" · "}
        <Link href={`${baseUrl}/dashboard`} style={footerLink}>
          Dashboard
        </Link>
      </Text>
    </>
  );
};

const footerLink = {
  color: "#9ca3af",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
};
