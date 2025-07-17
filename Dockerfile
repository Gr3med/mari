# START OF FILE Dockerfile

# استخدم صورة Node.js رسمية كقاعدة. اختر الإصدار الذي تفضله (مثلاً 20-slim هو خيار جيد)
FROM node:20-slim

# قم بتثبيت المكتبات الأساسية التي يحتاجها Chromium ليعمل بشكل صحيح
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    chromium \
    && rm -rf /var/lib/apt/lists/* # تنظيف ملفات الـ apt المؤقتة لتقليل حجم الصورة

# تعيين متغير البيئة للإنتاج
ENV NODE_ENV=production

# تعيين دليل العمل داخل الحاوية
WORKDIR /usr/src/app

# نسخ ملفات تعريف التبعيات (package.json و package-lock.json) أولاً
COPY package*.json ./

# **تغيير مهم:** استخدام npm ci لتثبيت التبعيات من package-lock.json
# هذا يضمن تثبيتًا سريعًا ومتسقًا في بيئة النشر
RUN npm ci

# نسخ بقية ملفات التطبيق
COPY . .

# تعريف المنفذ الذي سيستمع إليه التطبيق
EXPOSE 3000

# أمر بدء تشغيل التطبيق
CMD [ "node", "server.js" ]

# END OF FILE Dockerfile
