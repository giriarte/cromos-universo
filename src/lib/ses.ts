import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { CartItem } from "@/types/database";

const ses = new SESClient({
  region: process.env.APP_SES_REGION ?? process.env.APP_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.APP_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.APP_AWS_SECRET_ACCESS_KEY!,
  },
});

function ars(amount: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);
}

export async function sendOrderConfirmationEmail(
  to: string,
  buyerName: string,
  orderId: string,
  items: CartItem[]
) {
  const confirmed = items.filter((i) => !i.isWaitlist);
  const waitlist = items.filter((i) => i.isWaitlist);
  const confirmedTotal = confirmed.reduce((s, i) => s + i.article.price * i.quantity, 0);
  const waitlistTotal = waitlist.reduce((s, i) => s + i.article.price * i.quantity, 0);

  function itemRows(list: CartItem[]) {
    return list
      .map(
        (i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#374151">
            ${i.article.title} ×${i.quantity}
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:600;text-align:right;white-space:nowrap">
            ${ars(i.article.price * i.quantity)}
          </td>
        </tr>`
      )
      .join("");
  }

  const waitlistSection = waitlist.length > 0 ? `
    <tr>
      <td colspan="2" style="padding-top:16px;padding-bottom:4px">
        <span style="background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px">
          Lista de espera
        </span>
      </td>
    </tr>
    ${itemRows(waitlist)}
    <tr>
      <td style="padding-top:12px;font-size:14px;color:#b45309">Total lista de espera</td>
      <td style="padding-top:12px;font-size:14px;font-weight:700;color:#b45309;text-align:right">${ars(waitlistTotal)}</td>
    </tr>
  ` : "";

  const confirmedTotalRow = confirmed.length > 0 ? `
    <tr>
      <td style="padding-top:12px;font-size:14px;color:#374151">Total confirmado</td>
      <td style="padding-top:12px;font-size:16px;font-weight:700;color:#4338ca;text-align:right">${ars(confirmedTotal)}</td>
    </tr>
  ` : "";

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2 style="color:#4338ca;margin:0 0 4px">Universo Cromos</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px">Confirmación de pedido</p>

      <p style="color:#374151;margin:0 0 8px">Hola <strong>${buyerName}</strong>,</p>
      <p style="color:#374151;margin:0 0 24px;font-size:14px">
        Tu pedido fue recibido correctamente. El equipo de Universo Cromos se va a contactar
        con vos a la brevedad para coordinar la entrega. El pago se realiza en el momento de la entrega.
      </p>

      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="font-size:12px;color:#9ca3af;margin:0 0 12px">
          Pedido <strong style="color:#374151;font-family:monospace">#${orderId.slice(0, 8).toUpperCase()}</strong>
        </p>
        <table style="width:100%;border-collapse:collapse">
          ${itemRows(confirmed)}
          ${confirmedTotalRow}
          ${waitlistSection}
        </table>
      </div>

      ${waitlist.length > 0 ? `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:24px;font-size:13px;color:#92400e">
        <strong>Artículos en lista de espera:</strong> estos artículos están sin stock actualmente.
        Te avisaremos por email si quedan disponibles.
      </div>` : ""}

      <p style="color:#6b7280;font-size:13px;margin:0">
        ¡Gracias por elegirnos!
      </p>
    </div>
  `;

  const text = [
    `Hola ${buyerName},`,
    `Tu pedido #${orderId.slice(0, 8).toUpperCase()} fue recibido correctamente.`,
    "",
    confirmed.length > 0 ? "ARTÍCULOS CONFIRMADOS:" : "",
    ...confirmed.map((i) => `- ${i.article.title} ×${i.quantity}  ${ars(i.article.price * i.quantity)}`),
    confirmed.length > 0 ? `Total confirmado: ${ars(confirmedTotal)}` : "",
    waitlist.length > 0 ? "\nARTÍCULOS EN LISTA DE ESPERA:" : "",
    ...waitlist.map((i) => `- ${i.article.title} ×${i.quantity}  ${ars(i.article.price * i.quantity)}`),
    waitlist.length > 0 ? `Total lista de espera: ${ars(waitlistTotal)}` : "",
    "",
    "El equipo de Universo Cromos se contactará con vos para coordinar la entrega.",
    "El pago se realiza en el momento de la entrega.",
  ].filter((l) => l !== undefined).join("\n");

  await ses.send(
    new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: `Pedido recibido #${orderId.slice(0, 8).toUpperCase()} — Universo Cromos` },
        Body: {
          Html: { Data: html },
          Text: { Data: text },
        },
      },
    })
  );
}

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
