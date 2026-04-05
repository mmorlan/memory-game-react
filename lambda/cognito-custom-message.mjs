export const handler = async (event) => {
  if (
    event.triggerSource === 'CustomMessage_SignUp' ||
    event.triggerSource === 'CustomMessage_ResendCode'
  ) {
    const email = event.request.userAttributes.email;
    const code = event.request.codeParameter;
    const confirmUrl = `https://pairanoia.vercel.app/confirm?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`;

    event.response.emailSubject = 'Confirm your Pairanoia account';
    event.response.emailMessage = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
        <h2 style="color: #84cc16;">Confirm your account</h2>
        <p>Thanks for signing up for Pairanoia! Click the button below to verify your email address.</p>
        <a href="${confirmUrl}"
           style="display: inline-block; background: #84cc16; color: #111827; font-weight: 700;
                  padding: 0.75rem 1.5rem; border-radius: 0.5rem; text-decoration: none; margin: 1rem 0;">
          Confirm Account
        </a>
        <p style="color: #6b7280; font-size: 0.875rem;">
          Or copy this link into your browser:<br>
          <span style="word-break: break-all;">${confirmUrl}</span>
        </p>
      </div>
    `;
  }

  return event;
};
