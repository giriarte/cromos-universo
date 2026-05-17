import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({
  region: process.env.APP_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendVerificationEmail(to: string, code: string) {
  await ses.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: "Tu código de verificación — Universo Cromos" },
        Body: {
          Html: {
            Data: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                <h2 style="color:#4338ca;margin-bottom:8px">Universo Cromos</h2>
                <p style="color:#374151">Usá el siguiente código para confirmar tu pedido:</p>
                <div style="font-size:40px;font-weight:700;letter-spacing:8px;color:#1f2937;padding:24px 0">
                  ${code}
                </div>
                <p style="color:#6b7280;font-size:14px">El código expira en 10 minutos y solo puede usarse una vez.</p>
                <p style="color:#6b7280;font-size:14px">Si no iniciaste este pedido, ignorá este mensaje.</p>
              </div>
            `,
          },
          Text: {
            Data: `Tu código de verificación es: ${code}\n\nExpira en 10 minutos. Si no iniciaste este pedido, ignorá este mensaje.`,
          },
        },
      },
    })
  );
}
