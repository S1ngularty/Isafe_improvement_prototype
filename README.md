# ISAFE

## Prerequisites

- Python 3.11+
- Node.js 18+

## Backend (FastAPI + Python)

```powershell
# Create and activate virtual environment
python -m venv backend\.venv
backend\.venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r backend\requirements.txt

# Install Node.js dependencies
cd backend
npm install
cd ..
```

## Mobile

```powershell
cd mobile
npm install
cd ..
```

## Website

```powershell
cd website
npm install
cd ..
```

## Environment Variables

Create the following `.env` files:

### `backend/.env`
```
SUPABASE_URL=https://ipkrnojfydmjqmawhrev.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### `mobile/.env`
```
EXPO_PUBLIC_SUPABASE_URL=https://ipkrnojfydmjqmawhrev.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### `website/.env`
```
NEXT_PUBLIC_SUPABASE_URL=https://ipkrnojfydmjqmawhrev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
