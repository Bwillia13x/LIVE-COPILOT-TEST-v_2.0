# Quick Start Guide

Follow these steps to get Voice Notes Pro running locally.

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment

Copy the production template and add your Gemini API key:

```bash
cp .env.production .env.local
# Edit .env.local and set VITE_GEMINI_API_KEY=your_key_here
```

The application reads the key from `import.meta.env` and stores it in `sessionStorage` during runtime for increased security.

## 3. Start the Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## 4. Run Unit Tests

```bash
npm test
```

## 5. Build and Deploy

```bash
npm run build:production
npm run preview  # optional preview
# Deploy to Netlify
npm run deploy:netlify
# or deploy to Vercel
npm run deploy:vercel
```
