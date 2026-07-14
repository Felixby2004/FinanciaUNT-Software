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

Create a `.env` file in the `react-proyect` directory with the following:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the values with your actual Supabase project credentials (you can find these in your Supabase dashboard under Settings → API).

### 3. Run the development server

```bash
npm run dev
```

The app should now be available at http://localhost:5173!

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
- Add, view, and delete transactions
- Create and manage budgets
- Set and track financial goals

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
