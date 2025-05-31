import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const TOKEN_PATH = path.join(process.cwd(), 'token.json');

async function authorize() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('Token file missing. Get one from OAuth Playground first.');
  }

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));

  if (!token.client_id || !token.client_secret || !token.refresh_token) {
    throw new Error('Invalid token file. Missing required fields.');
  }

  const oAuth2Client = new google.auth.OAuth2(
    token.client_id,
    token.client_secret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oAuth2Client.setCredentials({
    refresh_token: token.refresh_token,
    access_token: token.access_token,
    expiry_date: token.expiry_date,
  });

   oAuth2Client.on('tokens', (newTokens) => {
    if (newTokens.refresh_token || newTokens.access_token) {
      const updatedToken = {
        ...token,
        ...newTokens,
        refresh_token: newTokens.refresh_token || token.refresh_token,
      };
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedToken, null, 2));
      console.log('🔑 Token refreshed and saved (includes refresh_token if provided)');
    }
  });

  // Force a token refresh by calling getAccessToken, which triggers refresh if expired
  try {
    await oAuth2Client.getAccessToken();
    return oAuth2Client;
  } catch (error) {
    console.error('❌ Token refresh failed:', error.message);
    throw new Error('Failed to refresh token. Please re-authenticate.');
  }
}


function createRawEmail(to, from, subject, html) {
  const emailLines = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
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
    `WhyNot100 <noreply@whynot100.com>`, // ודא שזה מוגדר כ alias ב־Gmail
    encodeSubject(`תזכורת ללמוד ל${subjectName}`),
    htmlContent
  );
  
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
    },
  });
  
  console.log('✅ Email sent successfully:', res.data.id);
};

// קידוד נושא עם עברית ל־UTF-8 Base64 לפי התקן
function encodeSubject(subject) {
  const base64Subject = Buffer.from(subject, 'utf-8').toString('base64');
  return `=?UTF-8?B?${base64Subject}?=`;
}