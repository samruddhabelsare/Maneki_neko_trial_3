# 🐈 Maneki Neko — Smart Restaurant AI

Welcome to the Maneki Neko Smart Restaurant ordering system. This project features an AI-powered customer ordering interface with anime-inspired personalities (Naruto, Goku, Doraemon, etc.), real-time chat ordering, and a full restaurant management suite.

## 📋 Requirements

To run this project locally, you need:

1.  **Node.js**: [Download LTS version](https://nodejs.org/) (v18 or higher recommended).
2.  **API Keys**:
    *   **NVIDIA NIM**: For the AI Chat logic (Llama 3.3).
    *   **ElevenLabs**: For the AI voice synthesis (specifically for the Doraemon character).
    *   **Supabase**: For database storage (Menu, Customers, Orders).
3.  **Browser**: A modern web browser with Microphone permissions enabled for voice ordering.

---

## 🚀 How to Run (One-Click)

The easiest way to start the project on Windows is using the automated startup script:

1.  Open the project folder in File Explorer.
2.  Double-click **`start_app.bat`**.
3.  The script will automatically:
    *   Check for Node.js/npm.
    *   Install dependencies (`npm install`).
    *   Create a default `.env` if missing.
    *   Verify your database connection.
    *   Launch the server and open the app in your browser.

---

## 💻 Manual Commands

If you prefer using the terminal (CMD/PowerShell/Terminal), follow these steps:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a file named `.env` in the root directory and add the following:
```env
PORT=3000
NVIDIA_API_KEY=your_nvidia_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Server
```bash
npm start
```

### 4. Access the App
Once the server is running, open these URLs:
*   **Customer App**: [http://localhost:3000/customer/](http://localhost:3000/customer/)
*   **Admin Panel**: [http://localhost:3000/admin/](http://localhost:3000/admin/)
*   **KDS (Kitchen Display)**: [http://localhost:3000/kds/](http://localhost:3000/kds/)

---

## 🛠️ Project Structure
*   `/customer`: The customer-facing ordering website (Chat + Manual).
*   `/admin`: Dashboard for restaurant managers to view orders/revenue.
*   `/kds`: Kitchen Display System for chefs to track active orders.
*   `/shared`: Shared utilities and Supabase database logic.
*   `server.js`: The Node.js backend that proxies AI requests to bypass CORS.
