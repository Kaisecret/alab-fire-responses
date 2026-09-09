function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

export function createCorrectionMessages(input: {
  firstName: string;
  reference: string;
  municipality: string;
  reason: string;
  applicationUrl: string;
}) {
  const firstName = escapeHtml(input.firstName);
  const reference = escapeHtml(input.reference);
  const municipality = escapeHtml(input.municipality);
  const reason = escapeHtml(input.reason);
  const applicationUrl = escapeHtml(input.applicationUrl);
  const emailSubject = `Action needed for ALAB application ${input.reference}`;
  const emailText = [
    `Hello ${input.firstName},`,
    "",
    `${input.municipality} Municipal BFP requested changes to application ${input.reference}.`,
    `Correction needed: ${input.reason}`,
    "",
    `Review and update your application: ${input.applicationUrl}`,
  ].join("\n");

  return {
    sms: `ALAB: Application ${input.reference} needs correction. Sign in to ALAB to review the request and update your application.`,
    emailSubject,
    emailText,
    emailHtml: `<!doctype html><html><body style="margin:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#172033"><div style="max-width:600px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden"><div style="background:#b42318;padding:20px 28px;color:#fff;font-weight:700;font-size:20px">ALAB Resident Application</div><div style="padding:28px"><p>Hello ${firstName},</p><p>${municipality} Municipal BFP reviewed application <strong>${reference}</strong> and requested a correction.</p><div style="margin:22px 0;padding:16px;border-left:4px solid #f59e0b;background:#fffbeb"><strong>Correction needed</strong><p style="margin:8px 0 0">${reason}</p></div><a href="${applicationUrl}" style="display:inline-block;background:#b42318;color:#fff;text-decoration:none;padding:12px 18px;border-radius:7px;font-weight:700">Review your application</a><p style="margin-top:24px;color:#667085;font-size:13px">For your security, sign in to ALAB before updating your information.</p></div></div></div></body></html>`,
  };
}
