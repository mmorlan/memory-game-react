export const handler = async (event) => {
  console.log('triggerSource:', event.triggerSource);
  console.log('event:', JSON.stringify(event, null, 2));

  if (
    event.triggerSource === 'CustomMessage_SignUp' ||
    event.triggerSource === 'CustomMessage_ResendCode'
  ) {
    event.response.emailSubject = 'Confirm your Pairanoia account';
    event.response.emailMessage = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#111827;border-radius:0.75rem;">
        <h2 style="color:#00ff3c;margin:0 0 0.5rem;">Pairanoia</h2>
        <p style="color:#9ca3af;margin:0 0 2rem;">Thanks for signing up! Enter the code below to confirm your account.</p>
        <div style="background:#1f2937;border:2px solid #00ff3c;border-radius:0.5rem;padding:1.5rem;text-align:center;margin-bottom:2rem;">
          <p style="color:#9ca3af;font-size:0.75rem;margin:0 0 0.5rem;letter-spacing:0.1em;text-transform:uppercase;">Verification Code</p>
          <p style="color:#00ff3c;font-size:2rem;font-weight:700;letter-spacing:0.25em;margin:0;">{####}</p>
        </div>
        <p style="color:#6b7280;font-size:0.75rem;margin:0;">This code expires in 24 hours. If you didn't create a Pairanoia account, ignore this email.</p>
      </div>
    `;
  }

  return event;
};
