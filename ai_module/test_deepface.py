import cv2
import numpy as np
from deepface import DeepFace

img = np.zeros((100, 100, 3), dtype=np.uint8)
try:
    reps = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=False)
    print(reps[0])
except Exception as e:
    print(e)
