# Al-Qur'an Al-Kareem FM 🎧📖

**Al-Qur'an Al-Kareem FM** is a comprehensive web-based platform that enhances access to Qur'anic recitations and programs. Users can listen to live broadcasts of the **إذاعة القرآن الكريم من القاهرة**, view the updated daily schedule, and enjoy additional features like scheduled recordings and MP3 downloads.

---

## 🌟 Features

1. **Live Broadcast**: 
   - Stream **إذاعة القرآن الكريم** directly over the internet using a Node.js server.
   - Listen from any device, anywhere in the world.

2. **Daily Updated Schedule**:
   - Automatically fetches the daily broadcast schedule.
   - Real-time updates displayed on the frontend.

3. **Recording Functionality**:
   - **Manual Recording**: Record any part of the live broadcast manually.
   - **Timed Recording**: Schedule recordings for specific programs or time slots.

4. **MP3 Downloads**:
   - Download recorded audio segments in MP3 format for offline listening.

5. **Searchable Reciter Playlists**:
   - Search for Qur'anic recitations from renowned reciters.
   - Filter playlists by reciter names for easy access.

6. **Real-Time Updates with Telegram**:
   - A Telegram listener fetches updates from **إذاعة القرآن الكريم** for dynamic scheduling and stream metadata.

7. **User-Friendly Interface**:
   - Fully responsive design in Arabic for seamless interaction on any device.

---

## 🛠️ Technologies Used

- **Frontend**: React.js, Tailwind CSS
- **Backend**: Flask, Flask-SocketIO, SQLAlchemy
- **Database**: SQLite (dynamic and static databases)
- **WebSockets**: Real-time communication using Socket.IO
- **Node.js**: Streaming server (`server.mjs`)
- **Telegram Listener**: Automated updates for schedule and metadata
- **Deployment**: Designed for deployment on local machines or servers

---

## 🚀 Getting Started

Follow these steps to set up the project on your local machine.

### Prerequisites

1. **Python**: Make sure Python 3.8+ is installed.
2. **Node.js and npm**: Required for running the Node.js streaming server and React frontend.
3. **Git**: Ensure Git is installed to clone the repository.
4. **FFmpeg**: Required for audio streaming. Install it via:
   - **MacOS**: `brew install ffmpeg`
   - **Linux**: `sudo apt install ffmpeg`
   - **Windows**: Download and install from [FFmpeg.org](https://ffmpeg.org).

