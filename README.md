# Quran Kareem Radio from Cairo — Online Platform 📻🕌✨

Welcome to the **Quran Kareem Radio** project! 🌙📿 This online platform streams the live broadcast of **إذاعة القرآن الكريم من القاهرة**, the oldest and most iconic radio station in Africa and the Middle East. 🌍 It holds a special place in the identity and childhood of every Egyptian and Arabic-speaking person. 🕌❤️

Unfortunately, the radio station lacked the technical expertise to create an online streaming platform. Seeing this gap, I took the initiative to build one. 🚀 The platform allows users to listen to live broadcasts, view and personalize the daily program schedule based on their timezone 🌐, and search through a comprehensive database of all reciters in the station’s history. 📚 It also offers features for recording favorite programs 🎙️📼 and friendly reminders to encourage Islamic habits. 🌟

Designed with both functionality and engagement in mind, this platform serves as a one-stop solution for staying connected to the rich tradition of Quranic broadcasting. 🎧✨

---

## Table of Contents 📖
1. [Features](#features) 🌟  
2. [What I Learned](#what-i-learned) 🧠  
3. [Tech Stack](#tech-stack) 💻  
4. [Live Demo](#live-demo) 🌐  
5. [Local Development](#local-development) 🛠️  
6. [License](#license) 📜  

---

## Features 🌟

1. **Live Stream Player** 🎧📻  
   Stream the Quran Kareem radio broadcast directly from the platform, with play/pause functionality and volume control. 🔊

2. **Program Schedule** 📅  
   View the daily schedule of Quran recitations and programs, tailored to your local timezone 🌍🕒.

3. **Recording** 🎙️📼  
   Record portions of the live broadcast, either manually or automatically, and download them in MP3 format. 🎵💾

4. **Personalized Notifications** 🔔💡  
   Set reminders for programs and receive friendly pop-ups to encourage Islamic habits. 🌙🌟

5. **Historical Database** 📚👳‍♂️  
   Search through a comprehensive database of all reciters who have contributed to the station’s legacy. 🌟

6. **Real-Time Updates** ⚡🔄  
   Stay updated with live schedule changes via WebSocket integration, eliminating the need for manual refreshes. 🌐✨

7. **User-Centric Design** 🖥️📱  
   A mobile-friendly and intuitive interface ensures accessibility across devices and user groups. 💻📲

---

## What I Learned 🧠

This project was an incredible learning experience that taught me how to build and connect a solid data pipeline to solve real-world problems. 🛠️💡 Here’s a breakdown:

1. **Data Automation and Cleaning** 🤖📊  
   - Automated raw schedule data retrieval via **Telegram Telethon API** 📩.  
   - Cleaned and structured messy, inconsistent data using the **Gemini API**, testing prompts to generate a JSON table. 📝✅

2. **Real-Time Functionality** ⚡🔄  
   - Integrated **WebSockets** to ensure instant schedule updates reflected on the platform without requiring page reloads. 🚀🌐

3. **Overcoming CORS Issues** 🌉🔓  
   - Built a **Node.js server** to handle live stream recording and data serving seamlessly, addressing CORS challenges. 🎙️📡

4. **Product Design Mindset** 🛠️💭  
   - Shifted focus from writing code to thinking like a product manager. 👨‍💻➕👔  
   - Conducted user testing 🧪, gathered feedback 📬, and adapted features to enhance the user experience. 🌟

---

## Tech Stack 💻

### Frontend 🖥️  
- **React** (with Vite) 🚀  
- **React Router** for navigation 🔗  
- **Tailwind CSS** for responsive design 🎨

### Backend 🛠️  
- **Node.js + Express** for handling stream recording and APIs 🎙️🔄  
- **Flask (Python)** for managing schedule data and user interactions 🐍✨  
- **SQLite** with **SQLAlchemy** for data persistence 💾

### Additional Tools 🛠️✨  
- **FFmpeg** for audio processing and MP3 recordings 🎵🎙️  
- **WebSockets** for real-time updates ⚡🌐  
- **Axios** for seamless HTTP communication between frontend and backend 📨

---

## Live Demo 🌐

Explore the platform at **[qurankareemradio.com](https://qurankareemradio.com/)**! 🎧🕌 Listen to the live broadcast and explore features like the schedule, reminders, and recordings. 🎙️✨

---

## Local Development 🛠️

Want to run the platform on your local machine? Follow these steps! 🏗️

### Prerequisites 📋
- **Node.js** (v14+) and npm/yarn  
- **Python** (3.7+) 🐍  
- **FFmpeg** installed 🎙️  
- Virtual environment tool for Python (optional but recommended)  

### Frontend Setup 🖥️  
1. Navigate to the `client` directory:  
   ```bash
   cd client
   ```
2. Install dependencies:  
   ```bash
   npm install
   ```
3. Start the development server:  
   ```bash
   npm run dev
   ```
4. Access the frontend at `http://localhost:5173`. 🌐

### Backend Setup (Node.js) 🛠️  
1. Navigate to the `server/node_server` directory:  
   ```bash
   cd server/node_server
   ```
2. Install dependencies:  
   ```bash
   npm install
   ```
3. Start the Node.js server:  
   ```bash
   node server.mjs
   ```
4. The backend server will be accessible at `http://localhost:3000`. 🔄

### Backend Setup (Flask) 🐍  
1. Create or activate a virtual environment:  
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Linux/Mac
   venv\Scripts\activate     # On Windows
   ```
2. Install Python dependencies:  
   ```bash
   pip install -r requirements.txt
   ```
3. Start the Flask app:  
   ```bash
   flask run
   ```
4. The Flask backend will run at `http://127.0.0.1:5000`. 🌐

---

## License 📜

This project is shared to preserve and enhance Quranic broadcasting. 🌙📻 For specific usage terms, please review the repository or contact me directly.  

Enjoy listening to the Quran 📿🕌 and feel free to contribute or suggest improvements! 💡
