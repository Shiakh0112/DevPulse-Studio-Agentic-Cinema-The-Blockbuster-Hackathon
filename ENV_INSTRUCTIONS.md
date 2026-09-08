# .env File Setup Guide (Detailed - Local Development)

Apne PC ko light rakhne ke liye hum sab kuch locally run karenge (Bina Docker aur gcloud ke). 
Aapke project folder (`devpulse-studio`) mein ek `.env` naam ki file maine pehle hi bana di hai. Usko open karo aur usme diye gaye steps ke hisaab se details dalo:

## 1. GEMINI_API_KEY
- **Kahan se milegi?** Google AI Studio
- **Kaise laayein?**
  1. Browser mein jao: https://aistudio.google.com/app/apikey
  2. Apne Google/Gmail account se login karo.
  3. **"Create API Key"** button par click karo.
  4. Ek lamba sa code aayega. Us code ko copy karo.
  5. Apni `.env` file me `GEMINI_API_KEY=` ke aage paste kardo.
  - *Example:* `GEMINI_API_KEY=AIzaSyA...`

## 2. GOOGLE_CLOUD_PROJECT
- **Kahan se milegi?** Google Cloud Console
- **Kaise laayein?**
  1. Browser mein jao: https://console.cloud.google.com/
  2. Upar search bar ke left me project ka naam likha hota hai, us par click karke **"New Project"** banao.
  3. Naam do `devpulse-studio` aur "Create" daba do.
  4. Project banne ke baad, uski **Project ID** wahan dikhegi (jaise `devpulse-studio-1234`). Us ID ko copy karo.
  5. `.env` file me `GOOGLE_CLOUD_PROJECT=` ke aage paste kardo.
  - *Example:* `GOOGLE_CLOUD_PROJECT=devpulse-studio-1234`

## 3. GOOGLE_APPLICATION_CREDENTIALS
- **Kahan se milegi?** Google Cloud Service Accounts
- **Kaise laayein?**
  1. Google Cloud Console me search karo "Service Accounts".
  2. "Create Service Account" pe click karo, koi bhi naam do (jaise `devpulse-sa`), aur "Create and Continue" dabao.
  3. "Select a role" pe click karke **"Owner"** select kar lo aur "Done" kardo.
  4. Jo account bana hai uspe click karo, upar **"Keys"** tab me jao.
  5. **Add Key -> Create new key -> JSON** select karo.
  6. Ek `.json` file aapke PC mein download ho jayegi.
  7. Us file ka naam badal kar `service-account.json` rakho.
  8. Usko apne folder `devpulse-studio/secrets/` ke andar daal do.
  9. `.env` file me is variable ko aise hi likha rehne do:
  - `GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account.json`

## 4. CLICKHOUSE_HOST, USER aur PASSWORD
- **Kahan se milegi?** ClickHouse Cloud
- **Kaise laayein?**
  1. Browser mein jao: https://clickhouse.com/cloud
  2. Free trial account banao.
  3. Ek naya "Service" banao.
  4. Jaise hi service banegi, ek screen aayegi "Connect to your service". Usme aapko **Host**, **Username** aur **Password** dikhega.
  5. Password sirf ek baar dikhta hai, isliye usko dhyan se copy karke rakh lo.
  6. In sabko `.env` file me paste kardo:
  - *Example:*
    `CLICKHOUSE_HOST=xxxxx.clickhouse.cloud`
    `CLICKHOUSE_PORT=8443`
    `CLICKHOUSE_USER=default`
    `CLICKHOUSE_PASSWORD=aapka_copy_kiya_password`
    `CLICKHOUSE_SECURE=true`
    `CLICKHOUSE_VERIFY=true`

## 5. GITHUB_TOKEN aur GITHUB_DEMO_REPO
- **Kahan se milegi?** Aapke GitHub Account me
- **Kaise laayein?**
  1. GitHub par nayi repository banao jiska naam `devpulse-demo` rakh do.
  2. `.env` mein usko aise likho: `GITHUB_DEMO_REPO=aapka-username/devpulse-demo`
  3. Token lene ke liye is link pe jao: https://github.com/settings/tokens
  4. **"Generate new token (classic)"** par click karo.
  5. **"repo"** wale option pe Tick/Check mark lagao (bahut zaroori hai).
  6. Niche jaake "Generate Token" dabao.
  7. Ek lambi key aayegi (`ghp_xxxxx...`), usko copy karke `.env` me paste kardo:
  - *Example:* `GITHUB_TOKEN=ghp_abc123...`

## 6. NEXT_PUBLIC_API_URL aur PORT
- Inko change **NAHI** karna hai. Ye local environment ke liye hain, inhe `.env` mein waise hi chhod dein:
  `NEXT_PUBLIC_API_URL=http://localhost:3000`
  `PORT=3000`
