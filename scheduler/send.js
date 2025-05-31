import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN_PATH = path.join('.', 'token.json');

function encodeSubject(subject) {
  const base64Subject = Buffer.from(subject, 'utf-8').toString('base64');
  return `=?UTF-8?B?${base64Subject}?=`;
}

// לא נפתח דפדפן - רק משתמשים בטוקן
async function authorize() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('token.json not found. Please generate it manually.');
  }

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));

  const oAuth2Client = new google.auth.OAuth2(
    token.client_id,
    token.client_secret
  );

  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

function createRawEmail(to, from, subject, html) {
  const emailLines = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ];
  const email = emailLines.join('\n');
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const sendReminderEmail = async (to, studentName, subjectName) => {
  const bom = '\uFEFF';
  const htmlContent = `
    ${bom}<div dir="rtl" style="font-family: Arial, sans-serif; font-size: 16px; color: #000;">
      <h3>שלום ${studentName},</h3>
      <p>רק תזכורת קטנה: הגיע הזמן לשבת ללמוד לקורס <strong>${subjectName}</strong>.</p>
      <p>בהצלחה!<br/>צוות למהלא100</p>
    </div>
  `;

  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = createRawEmail(
    to,
    'WhyNot100 <noreply@whynot100.com>',
    encodeSubject(`תזכורת ללמוד ל${subjectName}`),
    htmlContent
  );

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
    },
  });

  console.log('✅ Email sent:', res.data);
};
