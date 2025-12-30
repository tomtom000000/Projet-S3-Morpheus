let boxes = [];
let drawing = false;
let startX, startY;
let currentFilename = null;

const classColors = {
    0: "red",
    1: "lime",
};

// --------------------
// 1. Webcam
// --------------------
const video = document.getElementById("video");

let stream = null;
let webcamActive = false;
let tempActivation = false;

//matrix
let widthMatrix = window.innerWidth;
let heightMatrix = window.innerHeight;
let katakana ='01';
const canvas = document.getElementById('matrixCanvas');
const context = canvas.getContext('2d');
const fontSize = 16;
let columns = widthMatrix / fontSize;
let drops = Array.from({ length: columns }, () => 1);

document.getElementById("start-webcam-btn").onclick = async () => {
    const video = document.getElementById("video");

    if (!webcamActive) {
        // ✅ Activer la webcam
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        video.style.display = "inline-block";

        document.getElementById("start-webcam-btn").innerText = "⛔ Cacher le flux vidéo";
        webcamActive = true;

    } else {
        // ✅ Désactiver la webcam
        stream.getTracks().forEach(track => {
        track.stop();
        });
        stream = null;

        video.style.display = "none";

        document.getElementById("start-webcam-btn").innerText = "🎥 Voir le flux vidéo";
        webcamActive = false;
        
    }
};




document.getElementById("capture-btn").onclick = async () => {
    const video = document.getElementById("video");

    // ✅ Détermine si on doit activer la webcam juste pour la capture
    tempActivation = false;

    if (!stream) {
        // ✅ Activation temporaire
        tempActivation = true;

        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        await new Promise(resolve => {
            video.onloadedmetadata = () => resolve();
        });
    }

    // ✅ Capture dans un canvas
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    // ✅ Si la webcam a été activée temporairement → on la coupe
    if (tempActivation) {
        stream.getTracks().forEach(track => {
        track.stop();
        });
        stream = null;
        video.style.display = "none";
    }

    // ✅ Envoi au serveur
    canvas.toBlob(async blob => {
        const form = new FormData();
        form.append("image", blob, "capture.jpg");

        const res = await fetch("/upload", { method: "POST", body: form });
        const data = await res.json();

        currentFilename = data.filename;
        document.getElementById("image").src = "/image/" + currentFilename;
        document.getElementById("annotation-tools").style.display = "inline-block";
        boxes = data.boxes;
        renderBoxes();

        // ✅ Supprime le canvas temporaire
        canvas.remove();
        document.getElementById("image").style.display = "inline-block";
        document.getElementById("img-container").querySelector("p").remove();



    });
};

// --------------------
// 2. Affichage des bboxes
// --------------------
function getColor(cls) {
    return classColors[cls] || classColors.default;
}

function renderBoxes() {
    const container = document.getElementById("img-container");
    document.querySelectorAll(".bbox").forEach(e => e.remove());

    boxes.forEach((b) => {
        const div = document.createElement("div");
        div.className = "bbox";
        div.style.left = b.x1 + "px";
        div.style.top = b.y1 + "px";
        div.style.width = (b.x2 - b.x1) + "px";
        div.style.height = (b.y2 - b.y1) + "px";
        div.style.borderColor = getColor(b.cls);

        container.appendChild(div);
    });
}

// --------------------
// 3. Ajouter une bbox
// --------------------
function addBox() {
    const img = document.getElementById("image");
    let clickCount = 0;
    let p1 = null;

    document.body.style.cursor = 'url("/static/CreaBbox.png") 15 15, auto';

    // ✅ Empêche les bbox existantes de bloquer les clics
    document.querySelectorAll(".bbox").forEach(b => b.style.pointerEvents = "none");

    img.onclick = e => {
        const rect = img.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (clickCount === 0) {
            p1 = { x, y };
            clickCount = 1;
        } else {
            const p2 = { x, y };

            const x1 = Math.min(p1.x, p2.x);
            const y1 = Math.min(p1.y, p2.y);
            const x2 = Math.max(p1.x, p2.x);
            const y2 = Math.max(p1.y, p2.y);

            boxes.push({
                x1,
                y1,
                x2,
                y2,
                cls: parseInt(document.getElementById("label-select").value)
            });

            clickCount = 0;
            p1 = null;

            document.body.style.cursor = 'auto';

            // ✅ Réactive les bbox après création
            document.querySelectorAll(".bbox").forEach(b => b.style.pointerEvents = "auto");

            renderBoxes();
            img.onclick = null;
        }
    };
}


// --------------------
// 4. Sauvegarde
// --------------------
async function saveAll() {
    const img = document.getElementById("image");
    const container = document.getElementById("img-container");
    const form = new FormData();
    form.append("filename", currentFilename);
    form.append("boxes", JSON.stringify(boxes));

    await fetch("/save", { method: "POST", body: form });
    // traitement jolie image 
    
    img.src = ""; // enlève l'image
    img.style.display = "none";
    container.insertAdjacentHTML("beforeend", "<p>En attente d'une capture (⌐■_■)</p>");
    boxes=[];
    renderBoxes(); 
    document.getElementById("annotation-tools").style.display = "none";
    alert("✅ Annotation sauvegardée !");
}



function deleteLastBox() {
    if (boxes.length === 0) return;
    boxes.pop();          // ✅ supprime la dernière bbox
    renderBoxes();        // ✅ met à jour l'affichage
}


//fait le ménage dans les fichiers
document.addEventListener("keydown", async (e) => {
    if (e.key === "d" || e.key === "D") {
        const confirmDelete = confirm("Supprimer toutes les captures et labels ?");
        if (!confirmDelete) return;

        await fetch("/delete_all", { method: "POST" });

        alert("✅ Tous les fichiers ont été supprimés !");
    }
});




// Matrix 
function tmpMatrix(){
    widthMatrix = window.innerWidth;
    heightMatrix = window.innerHeight;
    columns = widthMatrix / fontSize;
    drops = Array.from({ length: columns }, () => 1);
    document.getElementById("matrixCanvas").style.width ="100%";
    document.getElementById("matrixCanvas").style.height ="100%";
    drawMatrix();
}

function drawMatrix() {
    widthMatrix = window.innerWidth;
    heightMatrix = window.innerHeight;
    columns = widthMatrix / fontSize;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.05)';
    context.fillRect(0, 0, widthMatrix, heightMatrix);
    context.fillStyle = "rgb(0,255,0)";
    
    context.font = `${fontSize}px monospace`;
    for (let i = 0; i < drops.length; i++) {
        const text = katakana.charAt(Math.floor(Math.random() * katakana.length));
        context.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > heightMatrix && Math.random() > 0.975) {
            drops[i] = 0;
        }
        drops[i]++;
    }
}

setInterval(drawMatrix, 50);
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
window.addEventListener("Michel", tmpMatrix);


document.addEventListener("keydown", (e) => {
    if (e.key === "c") {
        addBox();          // ✅ touche C → créer une bbox
    }
    if (e.key === "v") {
        deleteLastBox();   // ✅ touche V → supprimer la dernière bbox
    }
});