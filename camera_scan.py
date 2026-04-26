"""Run this script to find which camera index EpocCam/Camo uses."""
import cv2

print("Scanning camera indices 0-9...\n")
for i in range(10):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        ret, frame = cap.read()
        shape = frame.shape if ret else "no frame"
        print(f"  Camera {i}: available  {shape}")
        cap.release()
    else:
        print(f"  Camera {i}: not available")

print("\nSet CAMERA_INDEX in main.py to the EpocCam/Camo index.")
