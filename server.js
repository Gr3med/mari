// START OF TEST server.js (Reports every 5 reviews)

const express = require('express');
const cors = require('cors');
// cron ما زال موجوداً لكننا سنعتمد على العداد للتجربة بشكل أساسي
const cron = require('node-cron'); 
const { Client } = require('pg');
require('dotenv').config();

const { sendReportEmail } = require('./notifications.js');
const { createCumulativePdfReport } = require('./pdfGenerator.js');
const { sendTextMessage } = require('./whatsappSender.js');

const app = express();
const PORT = process.env.PORT || 3000;

// <-- جديد: متغيرات لتتبع عدد التقييمات ومنع التضارب
let reviewCounter = 0;
let isGeneratingReport = false;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

let dbReady = false;


// <-- جديد: دالة خاصة لإرسال التقارير المجمعة كل 5 تقييمات
async function generateAndSendBatchReport() {
    console.log('🚀 Triggering batch report for the last 5 reviews...');
    isGeneratingReport = true; // نمنع تشغيل التقارير الأخرى أثناء عمل هذه الدالة

    try {
        // استعلامات لجلب آخر 5 تقييمات وإحصائياتها
        const recentReviewsQuery = 'SELECT * FROM reviews ORDER BY id DESC LIMIT 5';
        const statsQuery = `
            SELECT 
                COUNT(id) as total_reviews, AVG(reception) as avg_reception, AVG(cleanliness) as avg_cleanliness,
                AVG(comfort) as avg_comfort, AVG(facilities) as avg_facilities, AVG(location) as avg_location,
                AVG(value) as avg_value
            FROM (SELECT * FROM reviews ORDER BY id DESC LIMIT 5) as last_five_reviews
        `;
        
        const recentRes = await dbClient.query(recentReviewsQuery);
        const statsRes = await dbClient.query(statsQuery);

        const recentReviews = recentRes.rows;
        const stats = statsRes.rows[0];

        if (stats.total_reviews == 0) {
            console.log('ℹ️ No reviews found for the batch report.');
            return;
        }

        const { pdfBuffer, htmlContent } = await createCumulativePdfReport(stats, recentReviews);
        
        const attachments = [{
            filename: `batch-report-${Date.now()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
        }];

        const title = "تقرير مجمع لآخر 5 تقييمات";
        const emailSubject = `📊 ${title} للفندق (${stats.total_reviews} تقييم)`;
        await sendReportEmail(emailSubject, htmlContent, attachments);
        console.log(`✅ Batch report sent successfully via email.`);

        const whatsappRecipient = process.env.WHATSAPP_RECIPIENT_NUMBER;
        if (whatsappRecipient) {
            const whatsappMessage = `*تقرير فندق ماريوت (دفعة جديدة)* 🏨\n\nتم إرسال *${title}* بنجاح إلى البريد الإلكتروني.\n\n- *عدد التقييمات في الدفعة:* ${stats.total_reviews}`;
            await sendTextMessage(whatsappRecipient, whatsappMessage);
        }

    } catch (err) {
        console.error(`❌ CRITICAL: Failed to generate BATCH report:`, err);
    } finally {
        isGeneratingReport = false; // نسمح بتشغيل التقارير مرة أخرى
        console.log('🔄 Batch report process finished.');
    }
}


// ------------------- نقطة النهاية لاستقبال التقييمات (مع التعديل) -------------------
app.post('/api/review', async (req, res) => {
    if (!dbReady) {
        return res.status(503).json({ success: false, message: 'السيرفر غير جاهز حاليًا.' });
    }
    try {
        const { roomNumber, reception, cleanliness, comfort, facilities, location, value, comments } = req.body;
        
        const query = {
            text: 'INSERT INTO reviews("roomNumber", reception, cleanliness, comfort, facilities, location, value, comments) VALUES($1, $2, $3, $4, $5, $6, $7, $8)',
            values: [roomNumber, reception, cleanliness, comfort, facilities, location, value, comments],
        };
        
        await dbClient.query(query);
        res.status(201).json({ success: true, message: 'شكرًا لك! تم استلام تقييمك بنجاح.' });
        
        // <-- جديد: زيادة العداد والتحقق منه بعد إرسال الرد للمستخدم مباشرة
        reviewCounter++;
        console.log(`📈 Review count is now: ${reviewCounter}`);
        
        if (reviewCounter >= 5 && !isGeneratingReport) {
            // تصفير العداد فوراً
            reviewCounter = 0; 
            console.log('🚩 Reached 5 reviews! Resetting counter and starting report generation in background.');
            // تشغيل الدالة في الخلفية حتى لا يتأخر الرد على المستخدم
            generateAndSendBatchReport();
        }

    } catch (error) {
        console.error('❌ ERROR in /api/review endpoint:', error);
        res.status(500).json({ success: false, message: 'خطأ فادح في السيرفر.' });
    }
});


// ------------------- تشغيل السيرفر وقاعدة البيانات -------------------
app.listen(PORT, () => {
    console.log(`🚀 Server is listening on port ${PORT}`);
    dbClient.connect()
        .then(async () => {
            console.log('✅ Connected to PostgreSQL DB.');
            await dbClient.query(`
                CREATE TABLE IF NOT EXISTS reviews (
                    id SERIAL PRIMARY KEY, "roomNumber" VARCHAR(50), reception INTEGER,
                    cleanliness INTEGER, comfort INTEGER, facilities INTEGER, location INTEGER,
                    value INTEGER, comments TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW()
                );
            `);
            dbReady = true;
            console.log("✅ Database is ready.");
            // setupScheduledTasks(); // يمكنك تعطيل المهام المجدولة مؤقتاً أثناء التجربة
        })
        .catch(error => {
            console.error('❌ CRITICAL: DB Connection/Setup Failed:', error);
        });
});
