# 🧠 NeuroClass: AI-Powered Classroom Engagement Analytics

NeuroClass is a privacy-preserving AI system designed to analyze classroom engagement using a camera feed and present actionable analytics to teachers via a modern web dashboard. 

**Crucially, this system DOES NOT store video or perform facial recognition.** 
Real-time video frames are converted into anonymized, ephemeral activity events.

---

## 🏗️ Architecture

The system consists of three main components:

1. **Frontend (React + Tailwind CSS)**: A sleek, admin-style dashboard for teachers to view engagement scores, phone usage, and attention timelines.
2. **Backend (Node.js + Express + MongoDB)**: A secure REST API that handles teacher authentication, ingests telemetry from the AI module, and serves aggregated analytics.
3. **AI Module (Python + OpenCV + YOLOv8)**: An edge-computing script that processes video frames in real-time, infers behavior, and pushes anonymous statistics to the backend.

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or via Atlas)
- Python (3.10+)

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```
*Note: Ensure your MongoDB instance is running. The server starts on port 5000.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Note: The React dashboard will start on the Vite default port (usually 5173).*

### 3. AI Module Setup
```bash
cd ai_module
pip install -r requirements.txt
python main.py
```
*Note: The script requires a connected webcam. It will download the YOLOv8n model automatically on first run.*

---

## 🛡️ Ethics & Privacy Principles

This project was built from the ground up with a strict adherence to ethical AI and student privacy:
- **No Video Storage:** Frames are captured in memory, analyzed, and immediately discarded. Nothing is saved to disk.
- **No Facial Recognition:** The AI detects "persons" generically. It does not extract facial features or attempt identity resolution.
- **Ephemeral Tracking:** The tracking IDs assigned to students expire the moment the session ends.
- **Data Minimization:** Only high-level state strings (e.g., `attentive`, `phone`) and timestamps are transmitted over the network.

---

## 👥 Team Roles (Mock Hackathon Structure)
- **AI Engineer:** Developed the OpenCV/YOLO pipeline for edge inference.
- **Backend Engineer:** Built the Express API and MongoDB aggregation pipelines.
- **Frontend Engineer:** Designed the React Dashboard with Recharts and Tailwind CSS.
