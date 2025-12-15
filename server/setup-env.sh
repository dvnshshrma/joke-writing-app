#!/bin/bash

echo "🔧 Supabase Setup Helper"
echo "=============================="
echo ""
echo "Follow these steps to get your Supabase credentials:"
echo ""
echo "1. Go to: https://supabase.com/dashboard"
echo "2. Create a new project (free tier)"
echo "3. Go to Settings > API"
echo "4. Copy your Project URL and anon public key"
echo ""
echo "Enter your Supabase Project URL:"
echo "(Format: https://xxxxx.supabase.co)"
echo ""
read -p "SUPABASE_URL: " SUPABASE_URL

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ URL cannot be empty"
    exit 1
fi

echo ""
echo "Enter your Supabase anon public key:"
echo "(Long string starting with eyJ...)"
echo ""
read -p "SUPABASE_KEY: " SUPABASE_KEY

if [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Key cannot be empty"
    exit 1
fi

# Create .env file
cat > .env << EOF
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_KEY
DB_NAME=comedica
PORT=3001
EOF

echo ""
echo "✅ Created .env file!"
echo ""
echo "Next steps:"
echo "1. Create the jokes table in Supabase SQL Editor (see SUPABASE_SETUP.md)"
echo "2. Run: npm run test-connection"
echo "3. Run: npm run migrate-cloud"
echo "4. Run: npm start"
echo ""
