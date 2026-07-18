# FinanciaUNT - React App

A modern web-based personal finance management application built with React and Supabase!

## Getting Started

### 1. Install dependencies

First, install the dependencies:

```bash
cd react-proyect
npm install
```

### 2. Set up environment variables

Create a `.env` file in the `react-proyect` directory using the example file:

```bash
cp .env.example .env
```

Then fill it with your real values:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
VITE_OPENAI_API_KEY=tu_openai_api_key
```

Replace the values with your actual Supabase project credentials (you can find these in your Supabase dashboard under Settings → API) and your OpenAI API key if you want the chatbot to use GPT instead of the local fallback.

> Important: the real `.env` file is ignored by Git, so your API key stays local.

### 3. Run the development server

```bash
npm run dev
```

The app should now be available at http://localhost:5173!

## GitHub and secrets

To publish this project on GitHub and keep the API keys secure:

1. Do not commit the real `.env` file.
2. Add these repository secrets in GitHub:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY`
3. The workflow in `.github/workflows/ci.yml` will use those secrets during the build.

If you deploy to Vercel, Netlify, or similar, add the same variables in the platform's environment settings.

## Features

### Authentication
- Login using email and password
- Registration for new users

### Admin Dashboard
- View all users and manage them (create/delete users)
- View system-wide statistics (total users, transactions, income, expenses)
- View expenses per user

### Client Dashboard
- View personal dashboard showing total income, expenses, and net savings
- See a predictive forecast for next month based on your recent activity
- Add, view, and delete transactions
- Create and manage budgets
- Set and track financial goals
- Use the financial chatbot from the navbar for quick advice

## Tech Stack

- React 19 (with Vite)
- React Router 7
- Supabase (for database and authentication)
- Custom CSS styling

## Project Structure

```
react-proyect/
├── src/
│   ├── components/
│   │   ├── admin/          # Admin-only components
│   │   ├── client/         # Client-only components
│   │   ├── Login.jsx       # Login component
│   │   ├── Register.jsx  # Registration component
│   ├── lib/
│   │   └── supabase.js    # Supabase client setup
│   ├── App.jsx              # Main app component with routing
│   ├── main.jsx             # App entry point
│   └── index.css           # Global styles
├── index.html
├── package.json
└── vite.config.js
```
