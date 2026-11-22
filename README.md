# Work-Abroad-Hub
A job seeking platform for international student in South Korea

This repository is the **server** for Work Abroad Hub. It serves the website (in `public/`) and replaces Firebase with our own backend.

**Stack:** Node.js + Express 5 (ES modules), MongoDB (Mongoose), Socket.IO for live updates and chat.

## Start it

1. Create `.env` from the example and fill in real values:
   ```
   cp .env.example .env
   ```
2. Make sure MongoDB is running (`brew services start mongodb-community`).
3. Install and run:
   ```
   cd ~/Documents/work-abroad-hub-server && npm install && npm run dev
   ```
4. Open http://localhost:4000

Never commit `.env`. It holds the real database address and secret key.
