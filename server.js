// START OF FINAL TEST server.js (Reports every 5 reviews with PDF on WhatsApp)

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { Client } = require('pg');
require('dotenv').config();

const { sendReportEmail } = require('./notifications.js');
const { createCumulativePdfReport } = require('./pdfGenerator.js');
// <--- التغيير الأول: استدعاء الدالة الصحيحة من whatsappSender.js
const { sendPdfViaWhatsApp } = require('./whatsappSender.js');

const app = express();
const PORT = process.env.PORT || 3000;

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

async function generateAndSendBatchReport() {
    console.log('🚀 Triggering batch report for the last 5 reviews...');
    isGeneratingReport = true;

    try {
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
            isGeneratingReport = false;
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

        // <--- التغيير الثاني: استدعاء دالة إرسال الـ PDF بالبيانات الصحيحة
        const whatsappRecipient = process.env.WHATSAPP_RECIPIENT_NUMBER;
        if (whatsappRecipient) {
            const caption = `*تقرير فندق ماريوت* 🏨\n\nإليك *${title}*.\n\n- إجمالي التقييمات: ${stats.total_reviews}\n- تاريخ: ${new Date().toLocaleDateString('ar-EG')}`;
            const pdfFilename = `report-${Date.now()}.pdf`;
            await sendPdfViaWhatsApp(whatsappRecipient, pdfBuffer, pdfFilename, caption);
        }

    } catch (err) {
        console.error(`❌ CRITICAL: Failed to generate BATCH report:`, err);
    } finally {
        isGeneratingReport = false;
        console.log('🔄 Batch report process finished.');
    }
}

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
        
        reviewCounter++;
        console.log(`📈 Review count is now: ${reviewCounter}`);
        
        if (reviewCounter >= 5 && !isGeneratingReport) {
            reviewCounter = 0; 
            console.log('🚩 Reached 5 reviews! Resetting counter and starting report generation in background.');
            generateAndSendBatchReport();
        }

    } catch (error) {
        console.error('❌ ERROR in /api/review endpoint:', error);
        res.status(500).json({ success: false, message: 'خطأ فادح في السيرفر.' });
    }
});

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
        })
        .catch(error => {
            console.error('❌ CRITICAL: DB Connection/Setup Failed:', error);
        });
});

// END OF FILE
