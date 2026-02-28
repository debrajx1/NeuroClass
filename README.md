# 🧠 NeuroClass: AI-Powered Classroom Engagement Analytics

NeuroClass is a premium, privacy-preserving AI system designed to revolutionize classroom management. By analyzing real-time camera feeds, it provides teachers with actionable engagement analytics, behavioral insights, and automated attendance—all through a sleek, modern dashboard.

---

## ✨ Key Features

- **🚀 Instant-Start AI Engine**: Parallelized startup sequence allows the camera to go live in `<1s` while heavy AI models (YOLOv8, Facenet) load asynchronously in the background.
- **👤 Intelligent Face Recognition**: Automated attendance tracking using DeepFace (Facenet) to identify registered students without storing raw facial data.
- **📊 Behavioral Analytics**: Real-time detection of student states using spatial heuristics:
  - **Attentive**: Active participation and focus.
  - **Phone Usage**: Detects mobile devices in proximity to students.
  - **Sleeping**: Identifies students leaning or resting based on skeletal aspect ratios.
  - **Talking**: Analyzes distance between peers to flag unauthorized collaboration.
- **⚡ Live Dashboard**: Real-time telemetry via WebSockets (Socket.IO) providing instant feedback on classroom "vibe" and individual engagement levels.
- **📅 Automated Scheduling**: Smart backend scheduler that automatically initiates and terminates analytics sessions based on the class timetable.

---

## 🏗️ Architecture

The system is built on a high-performance edge-to-cloud architecture:

1.  **Frontend (React + Vite + Tailwind)**: A premium admin interface featuring dynamic charts (Recharts) and live activity timelines.
2.  **Backend (Node.js + Express + MongoDB + Socket.IO)**: A robust API layer handling authentication, session management, and real-time data broadcasting.
3.  **AI Module (Python + OpenCV + YOLOv8 + DeepFace)**: An optimized edge computing script with threaded ingestion and asynchronous model loading.

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Python (3.10+)
- Webcam (USB or Integrated)

### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file with: MONGO_URI, JWT_SECRET, PORT=5002
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
# Ensure .env points to VITE_API_URL=http://localhost:5002
npm run dev
```

### 3. AI Module Setup
```bash
cd ai_module
pip install -r requirements.txt
# Create a .env file with: BACKEND_URL, INGESTION_API_KEY, TEACHER_ID
python main.py
```

---

## 🛡️ Ethics & Privacy Principles

NeuroClass is built on **Privacy by Design**:
- **Zero Video Retention**: Frames are processed in volatile memory and immediately discarded. No video is ever saved to disk.
- **Anonymized Processing**: The system primarily tracks "Anonymous IDs". Face recognition only maps these IDs to names locally for attendance and does not transmit raw biometric data.
- **Ephemeral Tracking**: Tracking identities are session-scoped and purged upon session termination.
- **Secure Ingestion**: All telemetry is protected via API keys and encrypted transport.

---

## 👥 Team & Roles
- **AI Specialist**: YOLOv8 Pipeline, Behavioral Heuristics, & Face Recognition.
- **Full-Stack Architect**: Express API, MongoDB Aggregations, & Real-time Socket Layer.
- **Product Designer**: React Dashboard, Data Visualization, & UX/UI.
