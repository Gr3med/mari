// START OF FILE whatsappSender.js

const axios = require('axios');
const FormData = require('form-data'); // مكتبة ضرورية لرفع الملفات

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

/**
 * دالة لإرسال ملف PDF عبر WhatsApp Cloud API
 * @param {string} to - رقم المستلم (مثال: '9665xxxxxxxx')
 * @param {Buffer} pdfBuffer - محتوى ملف الـ PDF كـ Buffer (يأتي من دالة إنشاء الـ PDF)
 * @param {string} filename - اسم الملف الذي سيظهر للمستلم (مثال: 'report.pdf')
 * @param {string} caption - التعليق النصي الذي سيظهر مع الملف
 */
async function sendPdfViaWhatsApp(to, pdfBuffer, filename, caption) {
    // التحقق من وجود المتغيرات الأساسية
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        console.warn("⚠️ WhatsApp credentials are missing. Skipping PDF message.");
        return;
    }

    try {
        // --- الخطوة 1: رفع الملف إلى خوادم فيسبوك للحصول على ID ---
        console.log('🔄 Uploading PDF to WhatsApp servers...');
        const form = new FormData();
        form.append('messaging_product', 'whatsapp');
        form.append('file', pdfBuffer, {
            filename: filename,
            contentType: 'application/pdf',
        });

        const uploadResponse = await axios.post(
            `https://graph.facebook.com/v15.0/${PHONE_NUMBER_ID}/media`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                },
            }
        );

        const mediaId = uploadResponse.data.id;
        if (!mediaId) {
            throw new Error('Failed to get media ID from WhatsApp upload response.');
        }
        console.log(`✅ PDF uploaded successfully. Media ID: ${mediaId}`);


        // --- الخطوة 2: إرسال رسالة تحتوي على ID الملف الذي تم رفعه ---
        console.log(`💬 Sending PDF document message to: ${to}...`);
        await axios.post(
            `https://graph.facebook.com/v15.0/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'document',
                document: {
                    id: mediaId, // استخدام الـ ID من الخطوة الأولى
                    filename: filename,
                    caption: caption,
                },
            },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log("✅ WhatsApp PDF message sent successfully.");

    } catch (error) {
        // طباعة رسالة خطأ مفصلة من واتساب إذا كانت متوفرة
        console.error('❌ Error sending WhatsApp PDF:', error.response ? error.response.data.error : error.message);
    }
}

// تصدير الدالة لجعلها متاحة للاستخدام في ملف server.js
module.exports = { sendPdfViaWhatsApp };

// END OF FILE whatsappSender.js
