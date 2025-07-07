# Email Integration Setup

This project uses React Email for email templates and Resend for sending emails.

## Setup Instructions

### 1. Get a Resend API Key

1. Sign up for a free account at [Resend.com](https://resend.com)
2. Once logged in, go to the [API Keys page](https://resend.com/api-keys)
3. Create a new API key
4. Copy the API key

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
RESEND_API_KEY=re_YOUR_API_KEY_HERE
```

### 3. Configure Email Domain (Production)

For production use with the custom domain:

1. Add your domain in Resend dashboard
2. Follow the DNS verification steps
3. Once verified, you can send from `noreply@splitwiseforynab.com`

For development/testing, you can use Resend's test email domain.

### 4. Development

To preview email templates during development:

```bash
npm run email
```

This will start the React Email development server at `http://localhost:3000`

## Email Templates

### Welcome Email

**File:** `emails/welcome.tsx`

**Triggered:** When a user connects their Splitwise account for the first time

**Variables:**
- `userName`: User's first name from Splitwise
- `userEmail`: User's email address from Splitwise

**Features:**
- Welcome message
- Getting started instructions
- How the integration works
- Support information
- Reply-to: support@splitwiseforynab.com

## Adding New Email Templates

1. Create a new file in the `emails/` directory
2. Use React Email components from `@react-email/components`
3. Export the template as default
4. Add a sending function in `services/email.ts`
5. Call the sending function where needed in your app

## Testing Emails

During development, Resend provides a test mode that doesn't actually send emails but validates the API calls. Check the Resend dashboard for logs of test emails.

## Troubleshooting

- **Email not sending:** Check that `RESEND_API_KEY` is set correctly
- **Domain verification issues:** Ensure DNS records are properly configured
- **Template preview issues:** Make sure the React Email dev server is running with `npm run email`