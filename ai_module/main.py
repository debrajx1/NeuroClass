import os
os.environ['TF_USE_LEGACY_KERAS'] = '1'

import cv2
import requests
import time
import json
import threading
from datetime import datetime, timezone
from dotenv import load_dotenv

# Heavy imports moved to background thread to allow instant camera startup
YOLO = None
DeepFace = None

import numpy as np
import urllib.request

# Load Environment Variables
load_dotenv()
API_KEY = os.getenv("INGESTION_API_KEY", "ai-secret-key")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
TEACHER_ID = os.getenv("TEACHER_ID", "mock_teacher_id")
CLASS_NAME = os.getenv("CLASS_NAME", "Demo Class")

HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
}

# Batch configuration
EVENT_BATCH_SIZE = 5
events_buffer = []

# Known students data
known_face_encodings = []
known_face_metadata = [] # stores dict with id, name, rollNumber

def start_session():
    """Get the session ID from environment or fallback a mock."""
    session_id = os.getenv("SESSION_ID")
    if session_id:
        print(f"[INFO] Using assigned session: {session_id}")
        return session_id
        
    print("[WARNING] No SESSION_ID provided in environment. Using mock ID.")
    return "mock_session_id_123"

def _push_worker(payload):
    """Background thread worker to push events without blocking video feed."""
    try:
        # 5 second timeout so a stalled backend doesn't indefinitely hang the thread
        res = requests.post(f"{BACKEND_URL}/api/ingestion/events", json=payload, headers=HEADERS, timeout=5)
        if res.status_code == 201:
            print(f"[INFO] Pushed {len(payload['events'])} events successfully.")
        else:
            print(f"[ERROR] Failed to push events: {res.text}")
    except Exception as e:
        print(f"[ERROR] Connection error pushing events (Will retry later): {e}")

def push_events_async(session_id):
    """Asynchronously pushes a batch of events to the backend."""
    global events_buffer
    if not events_buffer: return

    # Make a copy of the buffer and clear the global one immediately
    payload = {
        "sessionId": session_id,
        "events": list(events_buffer)
    }
    events_buffer.clear()
    
    # Start thread
    t = threading.Thread(target=_push_worker, args=(payload,))
    t.daemon = True
    t.start()

def is_inside(boxA, boxB):
    """Checks if boxA (e.g. phone) is inside or overlapping with boxB (e.g. person)"""
    xA1, yA1, xA2, yA2 = boxA
    xB1, yB1, xB2, yB2 = boxB
    
    # Simple overlap check
    overlap_x = max(0, min(xA2, xB2) - max(xA1, xB1))
    overlap_y = max(0, min(yA2, yB2) - max(yA1, yB1))
    
    return overlap_x > 0 and overlap_y > 0

def load_known_students():
    """Fetch students from backend and encode their faces."""
    print("[INFO] Fetching registered students from backend...")
    global known_face_encodings, known_face_metadata
    
    try:
        # Get ALL students from the new ingestion API route (API key auth)
        # We fetch all students regardless of CLASS_NAME so ad-hoc sessions can still recognize faces
        response = requests.get(
            f"{BACKEND_URL}/api/ingestion/students/all", 
            headers=HEADERS
        )
        
        # NOTE: For simplicity in this demo without setting up a full AI token auth flow, 
        # we bypass strict auth on the AI side if we hit errors or assume it works if unprotected
        if response.status_code == 200:
            students = response.json()
            print(f"[INFO] Found {len(students)} registered students across the system.")
            
            for student in students:
                try:
                    # Download image
                    image_url = student.get('imageUrl')
                    if not image_url: continue
                    
                    # Read image from URL
                    req = urllib.request.urlopen(image_url)
                    arr = np.asarray(bytearray(req.read()), dtype=np.uint8)
                    img = cv2.imdecode(arr, cv2.IMREAD_COLOR) # Ensure 3-channel BGR for Deepface
                    
                    if img is None:
                        print(f"  - Failed to decode image for {student['name']} from {image_url}")
                        continue
                    
                    
                    # Convert to RGB for DeepFace
                    # DeepFace represent expects an image array or path. We pass the cv2 array (BGR is fine for deepface default, but we can pass exact BGR to deepface as it uses cv2 natively)
                    
                    # Get encoding using DeepFace FaceNet (lightweight and works well)
                    try:
                        # Find face representation
                        reps = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=True)
                        if reps and len(reps) > 0:
                            # Use the embedding of the first face found in the reference image
                            embedding = reps[0]["embedding"]
                            known_face_encodings.append(embedding)
                            known_face_metadata.append({
                                "_id": student["_id"],
                                "name": student["name"],
                                "rollNumber": student["rollNumber"]
                            })
                            print(f"  + Successfully encoded: {student['name']}")
                    except Exception as df_e:
                         print(f"  - No face found or deepface error for {student['name']}: {df_e}")
                except Exception as e:
                    print(f"  - Error processing image for {student.get('name', 'Unknown')}: {e}")
        else:
             print(f"[WARNING] Could not fetch students. Status Code: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Connection error fetching students: {e}")

# Helper to calculate cosine distance
def cosine_distance(a, b):
    a = np.array(a)
    b = np.array(b)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 1.0
    return 1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Global AI state
yolo_loaded = False
facenet_loaded = False
model = None

def load_models_async():
    """Background thread to heavy-load AI models without blocking the camera"""
    global model, yolo_loaded, facenet_loaded, YOLO, DeepFace
    
    # Import heavy libraries only when thread starts
    print("[INFO] Loading Heavy Libraries (Background)...")
    from ultralytics import YOLO
    
    print("[INFO] Loading YOLOv8 Model (Background)...")
    model = YOLO("yolov8n.pt")
    yolo_loaded = True
    
    from deepface import DeepFace
    print("[INFO] Loading FaceNet Model (Background)...")
    try:
        # Pre-warm deepface
        DeepFace.build_model("Facenet")
    except Exception as e:
        print(f"[WARNING] Deepface pre-warm issue (will load on first face): {e}")

    load_known_students()
    facenet_loaded = True
    print("[INFO] All AI Models loaded and ready!")

def main():
    print("[INFO] Initializing Real-time Identity Tracking System...")
    
    # Start loading heavy models in the background
    threading.Thread(target=load_models_async, daemon=True).start()
    
    session_id = start_session()
    
    # Initialize Camera
    cap = cv2.VideoCapture(0)
    # Critical optimization: Set buffer size to 1 so we always grab the most recent frame
    # This prevents the "lag" effect where OpenCV processes 5 seconds in the past.
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print("[ERROR] Cannot access webcam. Exiting.")
        return

    print("[INFO] Starting real-time analysis loop. Press 'q' to quit.")
    
    frame_count = 0
    identity_cache = {} # Maps tracker ID -> {name, student_ref}
    cached_drawings = [] # Stores bounding boxes to draw on skipped frames for smooth UI

    try:
        while True:
            try:
                ret, frame = cap.read()
                if not ret: 
                    print("[WARNING] Frame drop or camera disconnected. Retrying...")
                    time.sleep(1)
                    # Attempt to reconnect if camera died
                    cap.open(0)
                    continue
                
                frame_count += 1
                
                # Show loading overlay until basic AI models (YOLO) are ready
                if not yolo_loaded:
                    cv2.putText(frame, "Starting Camera... Please wait.", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)
                    cv2.imshow("Privacy-Preserving Classroom Analysis", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                    continue
                
                # Periodically poll backend to see if session was closed by Teacher
                if frame_count % 30 == 0:
                    # Emergency Signal File Check
                    if os.path.exists("camera_stop.signal"):
                        print("[INFO] Camera stop signal file detected. Shutting down...")
                        try: os.remove("camera_stop.signal")
                        except: pass
                        break
    
                    try:
                        status_res = requests.get(f"{BACKEND_URL}/api/ingestion/session/{session_id}/status", headers=HEADERS, timeout=2)
                        if status_res.status_code == 404:
                             print("[INFO] Session not found (404). Assuming it was deleted. Shutting down...")
                             break
                        if status_res.status_code == 200 and status_res.json().get("status") == "completed":
                            print("[INFO] Session remotely closed by Teacher Dashboard. Shutting down camera...")
                            break
                    except requests.exceptions.RequestException as e:
                        print(f"[WARNING] Backend disconnected or timeout during status check: {e}")
                        pass # Ignore polling errors and keep running so live class isn't interrupted
                
                # High performance mode: Process every 6th frame to save massive CPU
                # while keeping detection responsive enough for presentations
                if frame_count % 6 != 0:
                    # Draw cached boxes to keep the video feed looking perfectly smooth at 30 FPS
                    for draw in cached_drawings:
                        cv2.rectangle(frame, draw['pt1'], draw['pt2'], draw['color'], 2)
                        cv2.putText(frame, draw['text'], draw['text_org'], cv2.FONT_HERSHEY_SIMPLEX, 0.5, draw['color'], 2)
                    
                    cv2.imshow("Privacy-Preserving Classroom Analysis", frame)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
                    continue
                    
                # Resize the frame before YOLO gets it to dramatically lower inference time
                # A 640px width is plenty for YOLO to detect people and objects.
                render_frame = frame.copy()
                # If camera gives 1080p, scale it down.
                h, w = frame.shape[:2]
                scale = 1.0
                if w > 640:
                    scale = 640.0 / w
                    frame = cv2.resize(frame, (640, int(h * scale)))
    
                # Run YOLO with tracking enabled and a STRICT confidence threshold
                # classes: 0 = person, 67 = cell phone, 73 = book, 63 = laptop
                # Adding conf=0.65 completely eliminates most false positives like "fans" or "chairs" detected as humans
                results = model.track(frame, persist=True, classes=[0, 67, 63, 73], conf=0.65, verbose=False)
                
                detected_persons = []
                detected_phones = []
                detected_laptops = []
                detected_books = []
                
                cached_drawings = [] # Clear old drawing cache for this new inference cycle
    
                if results and results[0].boxes:
                    boxes = results[0].boxes.xyxy.cpu().numpy()
                    clss = results[0].boxes.cls.cpu().numpy()
                    track_ids = results[0].boxes.id.cpu().numpy() if results[0].boxes.id is not None else [None] * len(boxes)
                    confs = results[0].boxes.conf.cpu().numpy()
                    
                    # Separate persons and objects with rationality checks
                    for box, cls, track_id, conf in zip(boxes, clss, track_ids, confs):
                        if int(cls) == 0 and track_id is not None:
                            # Rationality check: Ensure the bounding box actually makes sense for a human
                            x1, y1, x2, y2 = box
                            w = x2 - x1
                            h = y2 - y1
                            # If a box is extremely small (noise) or impossibly proportioned, skip it
                            if w > 30 and h > 30: 
                                detected_persons.append({'box': box, 'id': int(track_id), 'conf': conf})
                        elif int(cls) == 67:
                            detected_phones.append({'box': box})
                        elif int(cls) == 63:
                            detected_laptops.append({'box': box})
                        elif int(cls) == 73:
                            detected_books.append({'box': box})
                    # Generate proper UTC timestamp so JS frontend converts it correctly to local time
                    timestamp = datetime.now(timezone.utc).isoformat()
                    
                    # Analyze behavior per person
                    for person in detected_persons:
                        state = "attentive"
                        
                        x1, y1, x2, y2 = person['box']
                        w = x2 - x1
                        h = y2 - y1
    
                        # Advanced check for device/object usage
                        # Priority: Phone (bad) > Laptop (studying) > Book (studying)
                        for phone in detected_phones:
                            if is_inside(phone['box'], person['box']):
                                state = "phone"
                                break
                                
                        if state == "attentive":
                            for laptop in detected_laptops:
                                # Using overlapping logic since you sit slightly behind laptops
                                px1, py1, px2, py2 = person['box']
                                lx1, ly1, lx2, ly2 = laptop['box']
                                if not (px2 < lx1 or px1 > lx2 or py2 < ly1 or py1 > ly2): # simple overlap
                                    state = "using laptop"
                                    break
    
                        if state == "attentive":
                            for book in detected_books:
                                if is_inside(book['box'], person['box']):
                                    state = "reading book"
                                    break
    
                         # Check for talking (if closely adjacent to another person)
                        if state in ["attentive", "using laptop", "reading book"]: # Can talk while doing these
                            c_x = (x1 + x2) / 2
                            c_y = (y1 + y2) / 2
                            for other in detected_persons:
                                if other['id'] == person['id']: continue
                                ox1, oy1, ox2, oy2 = other['box']
                                oc_x = (ox1 + ox2) / 2
                                oc_y = (oy1 + oy2) / 2
                                # Close horizontally and vertically aligned
                                # STRICTER CHECK: People must be extremely close (heads almost touching) to trigger "talking"
                                if abs(c_y - oc_y) < h * 0.3 and abs(c_x - oc_x) < w * 1.0:
                                    state = "talking"
                                    break
                        
                        # Simplistic heuristic for sleeping: Aspect ratio of bounding box
                        if w > h * 1.5:  # Wider than it is tall -> likely slumped/sleeping
                            state = "sleeping"
                        
                        # --- NEW: Face Recognition & Identity Caching ---
                        student_ref = None
                        display_name = "Anonymous"
                        
                        # 1. Use cached identity if available for this YOLO tracker ID
                        if person['id'] in identity_cache:
                            student_ref = identity_cache[person['id']]['student_ref']
                            display_name = identity_cache[person['id']]['name']
                        
                        # 2. Only attempt fresh face recognition if looking up (not sleeping)
                        # Run if not identified yet (we rely on YOLO tracking for persistence to save CPU)
                        if facenet_loaded and state != "sleeping" and student_ref is None:
                            try:
                                # Make sure coords are within frame bounds
                                px1, py1 = max(0, int(x1)), max(0, int(y1))
                                px2, py2 = min(frame.shape[1], int(x2)), min(frame.shape[0], int(y2))
                                
                                person_img = frame[py1:py2, px1:px2]
                                
                                if person_img.size > 0 and len(known_face_encodings) > 0:
                                    # Extract DeepFace representations (still False so it doesn't crash, but we manually check confidence)
                                    reps = DeepFace.represent(img_path=person_img, model_name="Facenet", enforce_detection=False)
                                    
                                    if reps and len(reps) > 0:
                                        face_encoding = reps[0]["embedding"]
                                        
                                        # Compare with known DB using cosine distance
                                        distances = [cosine_distance(face_encoding, known_enc) for known_enc in known_face_encodings]
                                        
                                        best_match_index = np.argmin(distances)
                                        
                                        # STRICT Threshold: 0.45 instead of 0.85 to prevent misidentification on profile faces
                                        if distances[best_match_index] < 0.45:
                                            # Protect against IndexErrors if the known faces array gets out of sync
                                            if best_match_index < len(known_face_metadata):
                                                matched_student = known_face_metadata[best_match_index]
                                                student_ref = matched_student.get("_id")
                                                display_name = matched_student.get("name", "Anonymous")
                                                
                                                # Cache identity to this bounding box ID
                                                identity_cache[person['id']] = {
                                                    'student_ref': student_ref,
                                                    'name': display_name
                                                }
                                            else:
                                                if state == "attentive": state = "looking away"
                                        else:
                                            # If not recognized, could be looking away or anomalous
                                            if state == "attentive": state = "looking away"
                            except Exception as e:
                                pass # Ignore crop/encode errors to keep stream running
                        
                        # Append to buffer
                        events_buffer.append({
                            "timestamp": timestamp,
                            "anonymousId": f"student_{person['id']}",
                            "studentRef": student_ref, # Pass actual identity if found
                            "state": state,
                            "confidence": float(person['conf'])
                        })
                        
                        # Draw bounding box for visual debug
                        # Scale boxes back UP to draw on the original un-resized render_frame
                        if scale != 1.0:
                            x1, y1, x2, y2 = x1/scale, y1/scale, x2/scale, y2/scale
    
                        color = (0, 255, 0) if state == "attentive" else (0, 0, 255)
                        pt1 = (int(x1), int(y1))
                        pt2 = (int(x2), int(y2))
                        text_org = (int(x1), int(max(0, y1 - 10)))
                        
                        cached_drawings.append({
                            'pt1': pt1,
                            'pt2': pt2,
                            'color': color,
                            'text': f"{display_name} [{state}]",
                            'text_org': text_org
                        })
                        
                        cv2.rectangle(render_frame, pt1, pt2, color, 2)
                        cv2.putText(render_frame, f"{display_name} [{state}]", text_org, cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                
                # Display the high-res render frame with scaled-up boxes
                cv2.imshow("Privacy-Preserving Classroom Analysis", render_frame)
                
                # Push batch asynchronously if large enough
                if len(events_buffer) >= EVENT_BATCH_SIZE:
                    push_events_async(session_id)
                    
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
                    
            except Exception as loop_e:
                print(f"[ERROR] Main Loop Exception: {loop_e}")
                time.sleep(1)
                continue
            
    finally:
        # Cleanup
        print("[INFO] Ending session and pushing remaining events...")
        try:
            push_events_async(session_id)
        except:
            pass
        
        if cap:
            cap.release()
        cv2.destroyAllWindows()
    
    # End session on backend
    try:
        requests.put(f"{BACKEND_URL}/api/ingestion/session/{session_id}/end", headers=HEADERS, timeout=3)
        print("[INFO] Session marked as completed.")
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] Failed to communicate end session to backend: {e}")

if __name__ == "__main__":
    main()
