from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import pymongo
from ultralytics import YOLO
from datetime import datetime
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
uri = "mongodb+srv://bhavuk2004:bhavuk2004@cluster0.b5qk7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

app = Flask(__name__)
CORS(app)

# MongoDB connection
client = MongoClient(uri, server_api=ServerApi('1'))
db = client["proctoring"]
violations_collection = db["violations"]

# Load YOLOv8 face detection model
model = YOLO("yolov8n-face.pt")  # Adjust to your model's path

@app.route('/detect_faces', methods=['POST'])
def detect_faces():
    try:
        # Read image from the request
        file = request.files['image']
        file_bytes = np.frombuffer(file.read(), np.uint8)
        frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        # Run YOLOv8 on the frame
        results = model(frame)
        faces_detected = sum(len(result.boxes) for result in results)

        # Log violation if more than one face is detected
        if faces_detected > 1:
            violation = {
                "type": "Multiple Faces Detected",
                "timestamp": datetime.utcnow()
            }
            violations_collection.insert_one(violation)
            return jsonify({"violation": "Multiple Faces Detected", "faces": faces_detected})

        return jsonify({"faces": faces_detected})

    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
