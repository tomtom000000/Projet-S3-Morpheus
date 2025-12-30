const video = document.getElementById('video');
const resultImage = document.getElementById('resultImage');
const startButton = document.getElementById('btnOn');
const stopButton = document.getElementById('btnOff');

let stream = null;
let detectionInterval = null;
//intiation  pour le background
let widthMatrix = window.innerWidth;
let heightMatrix = window.innerHeight;
let katakana ='01';
const canvas = document.getElementById('matrixCanvas');
const context = canvas.getContext('2d');
const fontSize = 16;
let columns = widthMatrix / fontSize;
let drops = Array.from({ length: columns }, () => 1);
// les bo boutons :(
let isActive = false;

        // Demande l'accès à la caméra
startButton.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        startButton.disabled = true;
        stopButton.disabled = false;
        startDetection();
    } catch (err) {
        console.error("Erreur d'accès à la caméra:", err);
        alert("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
});

        // Arrête la détection et la caméra
stopButton.addEventListener('click', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        startButton.disabled = false;
        stopButton.disabled = true;
        clearInterval(detectionInterval);
        resultImage.src = "";
    }
});

        // Envoie les frames au serveur pour détection
function startDetection() {
    detectionInterval = setInterval(async () => {
                // Crée un canvas temporaire pour capturer la frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg');

                // Envoie la frame au serveur
    const response = await fetch('/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
    });

    const result = await response.json();
    if (result.classes.includes(0)){
        document.getElementById("alertSound").play();
        alert("AIE, "+result.classes.filter(x => x === 0).length+" étudiants qui dorment")
    }

    resultImage.src = result.image;
    }, 500);  // Envoie une frame toutes les 500ms
}
        

        


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


// LES BO boutons ! :(
      

        function activerFonctionnalite() {
            isActive = true;
            updateUI();
        }

        function desactiverFonctionnalite() {
            isActive = false;
            updateUI();
        }

        function updateUI() {
            const btnOn = document.getElementById('btnOn');
            const btnOff = document.getElementById('btnOff');

            if (isActive) {
                document.getElementById("txt").textContent = "";
                document.getElementById("resultImage").style.display ="flex";
                btnOn.disabled = true;
                btnOff.disabled = false;
            } else {
                document.getElementById("txt").textContent = "Pas de diffusion en cours, (╯‵□′)╯︵┻━┻";
                document.getElementById("resultImage").style.display ="none";
                btnOn.disabled = false;
                btnOff.disabled = true;
            }
        }
        // Initialiser l'UI au chargement
        updateUI();


