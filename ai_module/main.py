import cv2
import numpy as np
import os
import time
import json
import threading

# Global AI placeholders for deferred loading
requests = None

# Global AI state
yolo_loaded = False
facenet_loaded = False
model = None
YOLO = None
DeepFace = None
load_dotenv = None
datetime = None
timezone = None

# Known students data
known_face_encodings = []
known_face_metadata = []

class VideoStream:
    def __init__(self, src=0):
        self.stream = cv2.VideoCapture(src, cv2.CAP_DSHOW)
        self.stream.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        (self.grabbed, self.frame) = self.stream.read()
        self.stopped = False
        self.lock = threading.Lock()

    def start(self):
        threading.Thread(target=self.update, args=(), daemon=True).start()
        return self

    def update(self):
        while True:
            if self.stopped: return
            (grabbed, frame) = self.stream.read()
            with self.lock:
                self.grabbed = grabbed
                self.frame = frame

    def read(self):
        with self.lock:
            return self.grabbed, self.frame

    def stop(self):
        self.stopped = True

def smooth_box(old_box, new_box, alpha=0.6):
    if old_box is None: return new_box
    return [old_box[i] * (1 - alpha) + new_box[i] * alpha for i in range(4)]

def load_models_async():
    """Background thread to heavy-load AI models without blocking the camera"""
    global model, yolo_loaded, facenet_loaded, YOLO, DeepFace, load_dotenv, datetime, timezone
    
    import numpy as np
    import cv2
    
    print("[INFO] Loading Heavy Libraries (Background)...")
    try:
        from dotenv import load_dotenv as _load_dotenv
        from datetime import datetime as _datetime, timezone as _timezone
        from ultralytics import YOLO as _YOLO
        
        # Assign available globals
        load_dotenv = _load_dotenv
        datetime = _datetime
        timezone = _timezone
        YOLO = _YOLO
        
        print("[INFO] Loading YOLOv8 Model (Background)...")
        # Ensure we load from the ai_module directory if we are running from root
        model_path = os.path.join(os.path.dirname(__file__), "yolov8n.pt")
        if not os.path.exists(model_path):
             model_path = "yolov8n.pt" # Fallback to current dir or auto-download
        model = YOLO(model_path)
        
        # Warm-up inference to prime the engine
        print("[INFO] Warming up AI Engine...")
        dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
        model.predict(dummy_frame, verbose=False)
        
        yolo_loaded = True
        
        print("[INFO] Loading DeepFace (optional feature)...")
        from deepface import DeepFace as _DeepFace
        DeepFace = _DeepFace
        
        print("[INFO] Loading FaceNet Model (Background)...")
        try:
            DeepFace.build_model("Facenet")
            load_known_students()
            facenet_loaded = True
        except Exception as e:
            print(f"[WARNING] Deepface initialization issue: {e}")
            
    except Exception as e:
        import traceback
        with open("error.txt", "w") as f:
            f.write(f"Heavy model loading failed: {e}\n")
            f.write(traceback.format_exc())
        print(f"[ERROR] Heavy model loading failed: {e}")
        # Ensure YOLO is marked loaded if it succeeded before the crash
        if YOLO and model:
            yolo_loaded = True

    print("[INFO] AI Model loading thread completed.")

def load_known_students():
    """Fetch students from backend and encode their faces."""
    import urllib.request
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5002")
    API_KEY = os.getenv("INGESTION_API_KEY", "ai-secret-key")
    HEADERS = {"Content-Type": "application/json", "x-api-key": API_KEY}
    
    print("[INFO] Fetching registered students from backend...")
    global known_face_encodings, known_face_metadata
    
    try:
        response = requests.get(f"{BACKEND_URL}/api/ingestion/students/all", headers=HEADERS, timeout=5)
        if response.status_code == 200:
            students = response.json()
            for student in students:
                try:
                    image_url = student.get('imageUrl')
                    if not image_url: continue
                    req = urllib.request.urlopen(image_url)
                    arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
                    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                    if img is None: continue
                    
                    reps = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=True)
                    if reps and len(reps) > 0:
                        known_face_encodings.append(reps[0]["embedding"])
                        known_face_metadata.append({
                            "_id": student["_id"],
                            "name": student["name"],
                            "rollNumber": student["rollNumber"]
                        })
                except: pass
    except: pass

def start_session():
    # Use global version of requests
    global requests
    
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5002")
    API_KEY = os.getenv("INGESTION_API_KEY", "ai-secret-key")
    TEACHER_ID = os.getenv("TEACHER_ID")
    HEADERS = {"Content-Type": "application/json", "x-api-key": API_KEY}
    
    session_id = os.getenv("SESSION_ID")
    if session_id: return session_id
    
    # Try to find active session from backend
    if requests and TEACHER_ID:
        try:
            resp = requests.get(f"{BACKEND_URL}/api/ingestion/latest-session/{TEACHER_ID}", headers=HEADERS, timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                sid = data.get("sessionId")
                print(f"[INFO] Found active session: {sid}")
                return sid
            else:
                # Silent return for polling
                return None
        except Exception as e:
            print(f"[ERROR] Session lookup error: {e}")
        
    return None

def check_session_active(session_id):
    """Check if the session is still active in the backend"""
    global requests
    if not requests or not session_id or session_id == "mock_session_id_123":
        return True
    
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5002")
    API_KEY = os.getenv("INGESTION_API_KEY", "ai-secret-key")
    HEADERS = {"Content-Type": "application/json", "x-api-key": API_KEY}
    
    try:
        resp = requests.get(f"{BACKEND_URL}/api/ingestion/session/{session_id}/status", 
                            headers=HEADERS, timeout=5)
        if resp.status_code == 200:
            status = resp.json().get("status")
            return status == "active"
        elif resp.status_code == 404:
            return False # Session no longer exists
    except Exception as e:
        print(f"[DEBUG] Session status check failed: {e}")
    return True # Assume active if backend is temporarily unreachable

def is_inside(boxA, boxB):
    xA1, yA1, xA2, yA2 = boxA
    xB1, yB1, xB2, yB2 = boxB
    overlap_x = max(0, min(xA2, xB2) - max(xA1, xB1))
    overlap_y = max(0, min(yA2, yB2) - max(yA1, yB1))
    return overlap_x > 0 and overlap_y > 0

def cosine_distance(a, b):
    a = np.array(a)
    b = np.array(b)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0: return 1.0
    return 1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def main():
    global requests, np, cv2
    print("[INFO] NeuroClass AI Module Started.")
    
    import requests as _requests
    requests = _requests
    
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(dotenv_path=env_path)

    # Start loading heavy models IMMEDIATELY in the background
    # This happens while we are polling for a session
    threading.Thread(target=load_models_async, daemon=True).start()

    # Session Polling Loop
    session_id = None
    print("[INFO] Waiting for an active session to be started from the Dashboard...")
    while not session_id:
        session_id = start_session()
        if not session_id:
            time.sleep(5) # Poll every 5 seconds
    
    print(f"[INFO] Active Session Detected: {session_id}. Initializing AI Engine...")
    
    
    # Initialize Camera (Threaded)
    camera_idx = int(os.getenv("CAMERA_INDEX", 0))
    print(f"[INFO] Initializing Threaded Camera with index: {camera_idx}")
    vs = VideoStream(src=camera_idx).start()
    time.sleep(1.0) # Hub for camera driver

    print("[INFO] Camera stream active. Press 'q' to quit.")
    
    frame_count: int = 0
    identity_cache = {} 
    box_cache = {} # Track previous boxes for smoothing
    cached_drawings = [] 
    event_batch = []
    last_send_time = time.time()
    
    BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5002")
    API_KEY = os.getenv("INGESTION_API_KEY", "ai-secret-key")
    HEADERS = {"Content-Type": "application/json", "x-api-key": API_KEY}

    try:
        while True:
            ret, frame = vs.read()
            if not ret or frame is None: continue
            frame_count += 1
            
            # Show loading overlay until YOLO is ready
            if not yolo_loaded:
                cv2.putText(frame, "Loading AI Engine (sub-10s)...", (50, 50), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)
                cv2.imshow("Privacy-Preserving Classroom Analysis", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"): break
                continue

            # Standard processing logic continues...
            # (Rest of the logic from original main.py would be here, 
            # but I'll implement a concise version for the presentation)
            
            # Standard processing logic continues...

            # Periodically check if session was ended from Dashboard
            if frame_count % 150 == 0: # Every ~5-10 seconds depending on FPS
                if not check_session_active(session_id):
                    print(f"[INFO] Session {session_id} has been ended/completed. Stopping AI.")
                    break

            # Inference every 3rd frame (Faster Response)
            if frame_count % 3 != 0:
                for draw in cached_drawings:
                    cv2.rectangle(frame, draw['pt1'], draw['pt2'], draw['color'], 2)
                    cv2.putText(frame, draw['text'], draw['text_org'], cv2.FONT_HERSHEY_SIMPLEX, 0.5, draw['color'], 2)
                cv2.imshow("Privacy-Preserving Classroom Analysis", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"): break
                continue

            # Full inference logic
            render_frame = frame.copy()
            h, w = frame.shape[:2]
            scale = 640.0 / w if w > 640 else 1.0
            if scale != 1.0:
                frame = cv2.resize(frame, (640, int(h * scale)))

            results = model.track(frame, persist=True, classes=[0, 67, 63, 73], conf=0.65, verbose=False)
            cached_drawings = []

            if results and results[0].boxes:
                timestamp = datetime.now(timezone.utc).isoformat()
                boxes = results[0].boxes.xyxy.cpu().numpy()
                clss = results[0].boxes.cls.cpu().numpy()
                track_ids = results[0].boxes.id.cpu().numpy() if results[0].boxes.id is not None else [None] * len(boxes)
                confs = results[0].boxes.conf.cpu().numpy()

                # Separate persons and other objects
                persons = []
                other_objects = []
                for box, cls, track_id, conf in zip(boxes, clss, track_ids, confs):
                    # Smoothing logic
                    if track_id is not None:
                        t_id = int(track_id)
                        box_cache[t_id] = smooth_box(box_cache.get(t_id), box)
                        box = box_cache[t_id]

                    bx1, by1, bx2, by2 = box
                    center = ((bx1 + bx2) / 2, (by1 + by2) / 2)
                    if int(cls) == 0:
                        persons.append({
                            'box': box, 'track_id': track_id, 'conf': conf, 'center': center,
                            'w': bx2 - bx1, 'h': by2 - by1
                        })
                    else:
                        other_objects.append({'cls': int(cls), 'center': center, 'box': box})

                for p in persons:
                    track_id = p['track_id']
                    if track_id is None: continue
                    
                    # Default state
                    state = "attentive"
                    color = (0, 255, 0) # Green
                    
                    # --- Behavior Priority State Machine ---
                    
                    # 1. [CRITICAL] Phone Detection Heuristic (Class 67)
                    # We check if a phone is near the person.
                    for obj in other_objects:
                        if obj['cls'] == 67:
                            # Use Euclidean distance between centers
                            dist = np.sqrt((p['center'][0] - obj['center'][0])**2 + (p['center'][1] - obj['center'][1])**2)
                            # Check if phone is inside or very close to person box
                            if dist < 185: # Increased distance sensitivity
                                state = "phone"
                                break
                    
                    # 2. [HIGH] Sleeping Heuristic (Aspect Ratio)
                    if state == "attentive":
                        # If person is "wide" (leaning/lying on desk)
                        aspect_ratio = p['w'] / (p['h'] + 1e-6)
                        if aspect_ratio > 1.35: # Increased from 1.15 to avoid false positives for just sitting
                            state = "sleeping"
                    
                    # 3. [MEDIUM] Talking Heuristic (Distance to other persons)
                    if state == "attentive":
                        # If two people are very close, they are likely talking
                        for other_p in persons:
                            if other_p['track_id'] != track_id:
                                dist = np.sqrt((p['center'][0] - other_p['center'][0])**2 + (p['center'][1] - other_p['center'][1])**2)
                                # Threshold to distinguish "sitting next to each other" vs "leaning in to talk"
                                if dist < 190: # Reduced from 250 to avoid false talking detections for just sitting
                                    state = "talking"
                                    break
                    
                    # Set color based on state
                    if state == "phone" or state == "sleeping": color = (0, 0, 255) # Red
                    elif state == "talking" or state == "distracted": color = (0, 255, 255) # Yellow

                    display_name = "Anonymous"
                    student_ref = None
                    
                    # Full recognition logic
                    if int(track_id) in identity_cache:
                        student_ref = identity_cache[int(track_id)]['student_ref']
                        display_name = identity_cache[int(track_id)]['name']
                    elif facenet_loaded and len(known_face_encodings) > 0:
                        # Try to recognize
                        tx1, ty1, tx2, ty2 = map(int, p['box'])
                        # Crop with padding
                        pad = 10
                        person_crop = frame[max(0, ty1-pad):min(h, ty2+pad), max(0, tx1-pad):min(w, tx2+pad)]
                        
                        if person_crop.size > 0:
                            # Enhance image for low light (Brightness + Contrast)
                            # alpha 1.3 (+30% contrast), beta 40 (+40 brightness)
                            person_crop = cv2.convertScaleAbs(person_crop, alpha=1.3, beta=40)
                            
                            try:
                                if DeepFace:
                                    reps = DeepFace.represent(img_path=person_crop, model_name="Facenet", enforce_detection=False)
                                    if reps and len(reps) > 0:
                                        embedding = reps[0]["embedding"]
                                        best_dist = 1.0
                                        best_idx = -1
                                        for i, known_emb in enumerate(known_face_encodings):
                                            dist = float(cosine_distance(embedding, known_emb))
                                            if dist < best_dist:
                                                best_dist = dist
                                                best_idx = i
                                        
                                        # Incread threshold from 0.4 to 0.55 for low light
                                        if float(best_dist) < 0.55:
                                            match = known_face_metadata[best_idx]
                                            display_name = match['name']
                                            student_ref = match['_id']
                                            identity_cache[int(track_id)] = {'name': display_name, 'student_ref': student_ref}
                                            print(f"[INFO] Identified {display_name} (dist: {best_dist:.3f})")
                                        else:
                                            if best_idx != -1:
                                                print(f"[DEBUG] Closest match {known_face_metadata[best_idx]['name']} dist: {best_dist:.3f} (threshold: 0.55)")
                            except Exception as e:
                                print(f"[DEBUG] Recognition error for track {track_id}: {e}")
                    
                    # Drawing preparation
                    tx1, ty1, tx2, ty2 = map(float, p['box'])
                    if scale != 1.0:
                        tx1, ty1, tx2, ty2 = tx1/float(scale), ty1/float(scale), tx2/float(scale), ty2/float(scale)
                    
                    cached_drawings.append({
                        'pt1': (int(tx1), int(ty1)),
                        'pt2': (int(tx2), int(ty2)),
                        'color': color,
                        'text': f"{display_name} [{state}]",
                        'text_org': (int(tx1), int(ty1-10))
                    })

                    # Add to event batch
                    event_batch.append({
                        "timestamp": timestamp,
                        "anonymousId": int(track_id),
                        "studentRef": student_ref,
                        "state": state,
                        "confidence": float(p['conf'])
                    })

            # Send events every 2 seconds
            if time.time() - last_send_time > 2.0 and event_batch:
                def send_events(sid, batch):
                    if not requests: return
                    try:
                        resp = requests.post(f"{BACKEND_URL}/api/ingestion/events", 
                                            json={"sessionId": sid, "events": batch},
                                            headers=HEADERS, timeout=3)
                        if resp.status_code == 201:
                            print(f"[INFO] Successfully ingested {len(batch)} events")
                        else:
                            print(f"[DEBUG] Bulk ingestion failed: {resp.status_code}, {resp.text}")
                    except Exception as e:
                        print(f"[DEBUG] Ingestion error: {e}")
                
                if session_id and session_id != "mock_session_id_123":
                    threading.Thread(target=send_events, args=(session_id, event_batch.copy()), daemon=True).start()
                
                event_batch = []
                last_send_time = time.time()

            for draw in cached_drawings:
                cv2.rectangle(render_frame, draw['pt1'], draw['pt2'], draw['color'], 2)
                cv2.putText(render_frame, draw['text'], draw['text_org'], cv2.FONT_HERSHEY_SIMPLEX, 0.5, draw['color'], 2)
            
            cv2.imshow("Privacy-Preserving Classroom Analysis", render_frame)
            if cv2.waitKey(1) & 0xFF == ord("q"): break

    finally:
        vs.stop()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
