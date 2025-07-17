// START OF FILE whatsappSender.js

const axios = require('axios');

// استيراد المتغيرات من .env (يفترض أن dotenv تم تفعيله في server.js)
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

/**
 * دالة لإرسال رسالة نصية عبر WhatsApp Cloud API
 * @param {string} to - رقم المستلم (مثال: '9665xxxxxxxx')
 * @param {string} text - نص الرسالة
 */
async function sendTextMessage(to, text) {
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        console.warn("⚠️ WhatsApp credentials (TOKEN or PHONE_ID) are missing. Skipping message.");
        return;
    }
    
    console.log(`💬 Sending WhatsApp message to: ${to}...`);
    
    try {
        await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v15.0/${PHONE_NUMBER_ID}/messages`,
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            data: {
                messaging_product: 'whatsapp',
                to: to,
                text: { 
                    body: text,
                    preview_url: false // لضمان عدم ظهور معاينة لأي روابط
                },
            },
        });
        console.log("✅ WhatsApp message sent successfully.");
    } catch (error) {
        console.error('❌ Error sending WhatsApp message:', error.response ? error.response.data : error.message);
        // لا نلقي خطأ هنا لمنع توقف العملية الرئيسية
    }
}

module.exports = { sendTextMessage };

// END OF FILE whatsappSender.js