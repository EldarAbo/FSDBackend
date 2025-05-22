import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const bom = '\uFEFF';

export const sendReminderEmail = async (
  to,
  studentName,
  subjectName
) => {
  console.log("course "+subjectName);
  
  const htmlContent = `
   ${bom}<div dir="rtl" style="font-family: Arial, sans-serif; font-size: 16px; color: #000;">
    <h3>שלום ${studentName},</h3>
    <p>רק תזכורת קטנה: הגיע הזמן לשבת ללמוד לקורס <strong>${subjectName}</strong>.</p>
    <p>בהצלחה!<br/>צוות למהלא100</p>
   </div>
  `;
  
  await transporter.sendMail({
    from: `"למהלא100" <${process.env.EMAIL_USER}>`,
    to,
    subject: `תזכורת ללמוד ל${subjectName}`,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8'
    },
    encoding: 'utf-8',
    html: htmlContent,
  });
};
