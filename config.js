require('dotenv').config();

module.exports = {
    email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        recipient: process.env.RECIPIENT_EMAIL,
        sender: {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SENDER_EMAIL,
                pass: process.env.SENDER_PASS
            }
        }
    }
};