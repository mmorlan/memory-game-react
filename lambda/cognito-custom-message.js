exports.handler = async (event) => {
  console.log('Trigger source:', event.triggerSource);
  console.log('User attributes:', JSON.stringify(event.request.userAttributes));

  if (
    event.triggerSource === 'CustomMessage_SignUp' ||
    event.triggerSource === 'CustomMessage_ResendCode'
  ) {
    const email = event.request.userAttributes.email;
    const code = event.request.codeParameter;

    if (!email || !code) {
      console.error('Missing email or code', { email, code });
      return event;
    }

    const confirmUrl =
      'https://pairanoia.vercel.app/confirm' +
      '?email=' + encodeURIComponent(email) +
      '&code=' + encodeURIComponent(code);

    console.log('Confirm URL:', confirmUrl);

    event.response.emailSubject = 'Confirm your Pairanoia account';
    event.response.emailMessage = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 2rem 1rem;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #111827; border: 1px solid #374151; border-radius: 0.75rem; padding: 2rem;">
          <tr>
            <td align="center" style="padding-bottom: 1.5rem;">
              <div style="display: inline-block; background: #1f2937; border: 2px solid #00ff3c; border-radius: 9999px; width: 4rem; height: 4rem; line-height: 4rem; text-align: center; font-size: 1.5rem;">
                🃏
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 0.5rem;">
              <h1 style="margin: 0; color: #ffffff; font-size: 1.5rem; font-weight: 700;">Confirm your account</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 2rem;">
              <p style="margin: 0; color: #9ca3af; font-size: 0.875rem;">
                Thanks for signing up for <strong style="color: #00ff3c;">Pairanoia</strong>!<br>
                Click the button below to verify your email and start playing.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 2rem;">
              <a href="${confirmUrl}"
                 style="display: inline-block; background: #00ff3c; color: #111827; font-weight: 700;
                        font-size: 0.875rem; padding: 0.75rem 2rem; border-radius: 0.5rem;
                        text-decoration: none; letter-spacing: 0.025em;">
                Confirm Account
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <p style="margin: 0; color: #6b7280; font-size: 0.75rem;">
                Button not working? Copy this link into your browser:
              </p>
              <p style="margin: 0.5rem 0 0; color: #00ff3c; font-size: 0.75rem; word-break: break-all;">
                ${confirmUrl}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 2rem;">
              <p style="margin: 0; color: #4b5563; font-size: 0.75rem;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  return event;
};
