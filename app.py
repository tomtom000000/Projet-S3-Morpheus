from flask import Flask, render_template, request, jsonify, send_from_directory
import cv2
import numpy as np
import base64
import os
import time
import json
import glob
from ultralytics import YOLO

app = Flask(__name__)

CAPTURE_DIR = "captures"
LABELS_DIR = "labels"

os.makedirs(CAPTURE_DIR, exist_ok=True)
os.makedirs(LABELS_DIR, exist_ok=True)

# ✅ YOLO utilisé uniquement pour /detect (index.html)
model = YOLO("best.pt")


# -----------------------------
# PAGE PRINCIPALE (détection)
# -----------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/detect", methods=["POST"])
def detect():
    data = request.json
    img_data = data["image"].split(",")[1]  # supprime le préfixe
    img_bytes = base64.b64decode(img_data)

    nparr = np.frombuffer(img_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    results = model(frame, conf=0.02)
    annotated_frame = results[0].plot()

    _, buffer = cv2.imencode(".jpg", annotated_frame)
    jpg_as_text = base64.b64encode(buffer).decode("utf-8")

    #ndort detect
    # Récupère les classes détectées
    detected_classes = []
    for box in results[0].boxes:
        detected_classes.append(int(box.cls[0]))


    return jsonify({"image": "data:image/jpeg;base64," + jpg_as_text,
                    "classes":detected_classes})


# -----------------------------
# PAGE ANNOTATION (dataset)
# -----------------------------
@app.route("/annotate")
def annotate():
    return render_template("annotate.html")


@app.route("/upload", methods=["POST"])
def upload():
    file = request.files["image"]

    # ✅ Enregistrement de l'image brute, sans YOLO
    filename = f"capture_{int(time.time())}.jpg"
    path = os.path.join(CAPTURE_DIR, filename)
    file.save(path)

    # ✅ Pas de prédiction → aucune bbox renvoyée
    return jsonify({"filename": filename, "boxes": []})


@app.route("/image/<filename>")
def get_image(filename):
    return send_from_directory(CAPTURE_DIR, filename)


# -----------------------------
# SAUVEGARDE DES ANNOTATIONS
# -----------------------------
@app.route("/save", methods=["POST"])
def save():
    filename = request.form["filename"]
    boxes = json.loads(request.form["boxes"])

    # Chemin du fichier label
    label_name = filename.replace(".jpg", ".txt")
    label_path = os.path.join(LABELS_DIR, label_name)

    # Taille de l'image
    img_path = os.path.join(CAPTURE_DIR, filename)
    img = cv2.imread(img_path)
    h, w = img.shape[:2]

    # Écriture au format YOLO
    with open(label_path, "w") as f:
        for b in boxes:
            cls = b["cls"]
            x_center = ((b["x1"] + b["x2"]) / 2) / w
            y_center = ((b["y1"] + b["y2"]) / 2) / h
            bw = (b["x2"] - b["x1"]) / w
            bh = (b["y2"] - b["y1"]) / h

            f.write(f"{cls} {x_center} {y_center} {bw} {bh}\n")

    return jsonify({"status": "ok"})

#ménage fichier
@app.post("/delete_all")
def delete_all():
    # ✅ Supprime tous les fichiers dans captures/
    for f in glob.glob(os.path.join(CAPTURE_DIR, "*")):
        try:
            os.remove(f)
        except:
            pass

    # ✅ Supprime tous les fichiers dans labels/
    for f in glob.glob(os.path.join(LABELS_DIR, "*")):
        try:
            os.remove(f)
        except:
            pass

    return jsonify({"status": "ok"})



# -----------------------------
# LANCEMENT DU SERVEUR
# -----------------------------
if __name__ == "__main__":
    app.run()
