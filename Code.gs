/**
 * Missed Lead Recovery Demo
 *
 * Intended demo flow:
 * Google Form -> Google Sheet -> this Apps Script ->
 * instant lead acknowledgement + owner alert + follow-up queue.
 *
 * Before using with a real client:
 * 1. Duplicate the Sheet and Form for the client.
 * 2. Set the owner email and booking URL below.
 * 3. Install an "On form submit" trigger for onFormSubmit.
 * 4. Test with a test address before enabling production sends.
 */

const CONFIG = {
  OWNER_EMAIL: 'replace-with-owner@example.com',
  BOOKING_URL: 'https://calendly.com/replace-me',
  BUSINESS_NAME: 'Example Home Services',
  TEST_MODE: true,
  RESPONSE_SHEET_NAME: 'Form Responses 1',
  FOLLOW_UP_HOURS: 24,
};

const PIPELINE_FIELDS = [
  'Pipeline Status',
  'First Response At',
  'Next Follow-up At',
  'Lead Score',
  'Internal Notes',
];

function onFormSubmit(e) {
  if (!e || !e.namedValues || !e.range) {
    throw new Error('Run this function from an installed form-submit trigger.');
  }

  const sheet = e.range.getSheet();
  const values = e.namedValues;
  const lead = {
    name: readField(values, ['Name', 'Full Name', 'Your name']),
    email: readField(values, ['Email', 'Email Address', 'Your email']),
    phone: readField(values, ['Phone', 'Phone Number', 'Your phone']),
    service: readField(values, ['Service Needed', 'What service do you need?', 'Service']),
    preferredTime: readField(values, ['Preferred Time', 'Preferred contact time', 'When should we call?']),
    details: readField(values, ['Details', 'Project Details', 'Tell us more']),
  };

  const now = new Date();
  const followUp = new Date(now.getTime() + CONFIG.FOLLOW_UP_HOURS * 60 * 60 * 1000);
  const score = scoreLead(lead);

  ensurePipelineColumns(sheet);
  const headers = getHeaders(sheet);
  const row = e.range.getRow();
  writeByHeader(sheet, row, headers, 'Pipeline Status', 'New');
  writeByHeader(sheet, row, headers, 'First Response At', now);
  writeByHeader(sheet, row, headers, 'Next Follow-up At', followUp);
  writeByHeader(sheet, row, headers, 'Lead Score', score);
  writeByHeader(sheet, row, headers, 'Internal Notes', 'Auto-acknowledged; owner review required.');

  if (CONFIG.TEST_MODE) {
    console.log(JSON.stringify({ event: 'TEST_MODE', lead, score }));
    return;
  }

  if (lead.email) {
    MailApp.sendEmail({
      to: lead.email,
      subject: `We received your request — ${CONFIG.BUSINESS_NAME}`,
      htmlBody: buildLeadEmail(lead),
      name: CONFIG.BUSINESS_NAME,
    });
  }

  MailApp.sendEmail({
    to: CONFIG.OWNER_EMAIL,
    subject: `New lead: ${lead.name || 'Unknown'} — ${lead.service || 'Service request'}`,
    htmlBody: buildOwnerEmail(lead, score, followUp),
    name: 'Lead Recovery Workflow',
  });
}

/** Run manually or from a time-based trigger after testing. */
function sendFollowUps() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.RESPONSE_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet not found: ${CONFIG.RESPONSE_SHEET_NAME}`);

  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < rows.length; i++) {
    const rowNumber = i + 1;
    const status = valueByHeader(rows[i], headers, 'Pipeline Status');
    const nextFollowUp = valueByHeader(rows[i], headers, 'Next Follow-up At');
    const email = valueByHeader(rows[i], headers, 'Email Address') || valueByHeader(rows[i], headers, 'Email');

    if (!email || !nextFollowUp || ['Won', 'Lost', 'Closed'].includes(String(status))) continue;
    if (new Date(nextFollowUp) > now) continue;

    if (CONFIG.TEST_MODE) {
      console.log(`TEST_MODE follow-up would be sent to ${email} on row ${rowNumber}`);
      continue;
    }

    MailApp.sendEmail({
      to: email,
      subject: `Checking in — ${CONFIG.BUSINESS_NAME}`,
      htmlBody: `<p>Hi there,</p><p>Just checking whether you still need help with your request. You can reply to this email or choose a convenient time here: <a href="${CONFIG.BOOKING_URL}">${CONFIG.BOOKING_URL}</a>.</p><p>— ${CONFIG.BUSINESS_NAME}</p>`,
      name: CONFIG.BUSINESS_NAME,
    });
    writeByHeader(sheet, rowNumber, headers, 'Pipeline Status', 'Follow-up Sent');
    writeByHeader(sheet, rowNumber, headers, 'Next Follow-up At', '');
  }
}

function readField(namedValues, candidates) {
  for (const candidate of candidates) {
    if (namedValues[candidate] && namedValues[candidate][0]) return String(namedValues[candidate][0]).trim();
  }
  return '';
}

function scoreLead(lead) {
  let score = 0;
  if (lead.email) score += 2;
  if (lead.phone) score += 2;
  if (lead.service) score += 2;
  if (lead.preferredTime) score += 1;
  if (lead.details && lead.details.length > 20) score += 2;
  return Math.min(score, 9);
}

function ensurePipelineColumns(sheet) {
  const headers = getHeaders(sheet);
  let lastColumn = Math.max(sheet.getLastColumn(), 1);
  for (const field of PIPELINE_FIELDS) {
    if (!headers.includes(field)) {
      lastColumn += 1;
      sheet.getRange(1, lastColumn).setValue(field);
    }
  }
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(String);
}

function writeByHeader(sheet, row, headers, header, value) {
  const column = headers.indexOf(header) + 1;
  if (column > 0) sheet.getRange(row, column).setValue(value);
}

function valueByHeader(rowValues, headers, header) {
  const column = headers.indexOf(header);
  return column >= 0 ? rowValues[column] : '';
}

function buildLeadEmail(lead) {
  return `<p>Hi ${escapeHtml(lead.name || 'there')},</p><p>Thanks for contacting ${CONFIG.BUSINESS_NAME}. We received your request and a team member will review it shortly.</p><p>If you prefer, you can choose a time here: <a href="${CONFIG.BOOKING_URL}">${CONFIG.BOOKING_URL}</a>.</p><p>— ${CONFIG.BUSINESS_NAME}</p>`;
}

function buildOwnerEmail(lead, score, followUp) {
  return `<p><strong>New lead received</strong></p><p><strong>Name:</strong> ${escapeHtml(lead.name)}<br><strong>Email:</strong> ${escapeHtml(lead.email)}<br><strong>Phone:</strong> ${escapeHtml(lead.phone)}<br><strong>Service:</strong> ${escapeHtml(lead.service)}<br><strong>Preferred time:</strong> ${escapeHtml(lead.preferredTime)}<br><strong>Details:</strong> ${escapeHtml(lead.details)}<br><strong>Lead score:</strong> ${score}/9<br><strong>Follow-up target:</strong> ${followUp}</p><p>Human review is required before quoting or scheduling.</p>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
