// START OF FILE notifications.js

const nodemailer = require('nodemailer');
const config = require('./config.js');

// دالة لإرسال بريد إلكتروني، يمكن أن تحتوي على مرفقات
async function sendReportEmail(subject, htmlContent, attachments = []) {
    if (!config.email.enabled) {
        console.log("ℹ️ Email notifications are disabled.");
        return;
    }
    try {
        const transporter = nodemailer.createTransport(config.email.sender);
        const mailOptions = {
            from: `"تقارير الفندق" <${config.email.sender.auth.user}>`,
            to: config.email.recipient,
            subject: subject,
            html: htmlContent,
            attachments: attachments // هنا نضيف المرفقات
        };
        console.log(`📤 Sending email to: ${config.email.recipient}...`);
        await transporter.sendMail(mailOptions);
        console.log("✅ Email report sent successfully.");
    } catch (error) {
        console.error('❌ Error sending email report:', error);
        throw error;
    }
}

// تم حذف دالة generatePdf القديمة التي كانت تستخدم 'html-pdf'
// سيتم الآن التعامل مع إنشاء PDF في ملف pdfGenerator.js

module.exports = { sendReportEmail }; // تصدير دالة إرسال البريد فقط
// END OF FILE notifications.js
