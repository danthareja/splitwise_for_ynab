import { Hr, Link, Text } from "@react-email/components";
import { emailStyles } from "./email-styles";
import { baseUrl } from "./email-layout";

interface EmailFooterProps {
  reason: string;
}

export const EmailFooter = ({ reason }: EmailFooterProps) => {
  return (
    <>
      <Hr style={emailStyles.hr} />

      <Text style={emailStyles.footer}>
        This email was sent to you {reason}.
      </Text>

      <Text style={emailStyles.footer}>
        {/* <Link href={`${baseUrl}/settings`} style={emailStyles.link}>
          Manage email preferences
        </Link>
        {" · "} */}
        <Link href={`${baseUrl}/privacy`} style={emailStyles.link}>
          Privacy Policy
        </Link>
      </Text>
    </>
  );
};
