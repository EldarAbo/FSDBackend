import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN_PATH = path.join('.', 'token.json');

// Enhanced authorize function that works with your existing token.json
async function authorize() {
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('token.json not found. Please generate it first.');
  }

  const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  
  // Create OAuth2 client with credentials from token file
  const oAuth2Client = new google.auth.OAuth2(
    tokenData.client_id,
    tokenData.client_secret
  );

  // Set the stored token
  oAuth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    scope: tokenData.scope,
    token_type: tokenData.token_type,
    expiry_date: tokenData.expiry_date
  });

  // Check if token is expired or about to expire
  if (tokenData.expiry_date && Date.now() > tokenData.expiry_date - 30000) { // 30 seconds buffer
    try {
      const { credentials } = await oAuth2Client.refreshAccessToken();
      oAuth2Client.setCredentials(credentials);
      
      // Update the token file with new access token and expiry
      const updatedToken = {
        ...tokenData,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
        token_type: credentials.token_type,
        refreshAccessToken: credentials.refresh_token || tokenData.refresh_token, // Use existing refresh token if available
      };
      
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedToken, null, 2));
      console.log('Token refreshed and saved');
    } catch (refreshError) {
      console.error('Error refreshing access token:', refreshError);
      throw new Error('Could not refresh access token. Please re-authenticate.');
    }
  }

  return oAuth2Client;
}

// Your existing helper functions remain the same
function encodeSubject(subject) {
  const base64Subject = Buffer.from(subject, 'utf-8').toString('base64');
  return `=?UTF-8?B?${base64Subject}?=`;
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
  try {
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
    return res.data;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.response) {
      console.error('API Error Details:', error.response.data);
    }
    throw error;
  }
};