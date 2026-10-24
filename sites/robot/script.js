// Aktuální úhly serv S0–S5 pro 3D simulaci (sim.js), výchozí pozice z firmwaru
const DEFAULT_POSE = [130, 100, 150, 0, 180, 70];
window.armState = [...DEFAULT_POSE];

let port = null;
let writer = null;
let writableStreamClosed = null;

const connectBtn = document.getElementById('connect-btn');
const statusText = document.getElementById('status-text');
const supported = "serial" in navigator;

// Bez Web Serial funguje aspoň simulace, ovládání skutečného robota ne
if (!supported) {
  connectBtn.disabled = true;
  connectBtn.title = "Ovládání robota funguje jen v Chrome, Edge nebo Opeře";
  statusText.innerText = "Prohlížeč nepodporuje Web Serial – jen simulace";
}

async function disconnect() {
  try {
    if (writer) {
      await writer.close();
      await writableStreamClosed.catch(() => {});
    }
  } catch (err) {
    console.error("Chyba při zavírání zápisu: ", err);
  }
  try {
    if (port) await port.close();
  } catch (err) {
    console.error("Chyba při zavírání portu: ", err);
  }
  port = null;
  writer = null;
  writableStreamClosed = null;
  updateUI(false);
}

connectBtn.addEventListener('click', async () => {
  if (!supported) {
    alert("Tenhle prohlížeč Web Serial nepodporuje. Použijte Chrome nebo Edge.");
    return;
  }
  if (port) {
    await disconnect();
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    const textEncoder = new TextEncoderStream();
    writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
    writer = textEncoder.writable.getWriter();

    // Arduino se po otevření portu restartuje, chvíli počkáme, než začne poslouchat
    statusText.innerText = "Připojuji…";
    statusText.className = "status disconnected";
    connectBtn.disabled = true;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    connectBtn.disabled = false;

    updateUI(true);
  } catch (err) {
    console.error("Chyba při připojování k sériovému portu: ", err);
    connectBtn.disabled = false;
    if (port) {
      try { await port.close(); } catch (e) { /* port se nepodařilo otevřít */ }
    }
    port = null;
    writer = null;
    writableStreamClosed = null;
    updateUI(false);
    if (err && err.name !== "NotFoundError") {
      alert("Nepodařilo se připojit k zařízení. Zavřete Arduino IDE (Serial Monitor) a zkuste to znovu.");
    }
  }
});

// Když někdo vytáhne USB kabel
if (supported) {
  navigator.serial.addEventListener('disconnect', (e) => {
    if (e.target === port) {
      port = null;
      writer = null;
      writableStreamClosed = null;
      updateUI(false);
    }
  });
}

function updateUI(isConnected) {
  if (isConnected) {
    statusText.innerText = "Připojeno";
    statusText.className = "status connected";
    connectBtn.innerText = "🔌 Odpojit Arduino";
  } else {
    statusText.innerText = "Odpojeno";
    statusText.className = "status disconnected";
    connectBtn.innerText = "🔌 Připojit Arduino";
  }

  const badge = document.getElementById('sim-mode');
  if (badge) {
    badge.innerText = isConnected ? "simulace + robot" : "simulace";
    badge.classList.toggle('live', isConnected);
  }
}

async function sendServoCommand(servoId, angle) {
  window.armState[servoId] = Number(angle);
  if (writer) {
    const command = `${servoId} ${angle}\n`;
    try {
      await writer.write(command);
    } catch (err) {
      console.error("Příkaz se nepodařilo odeslat: ", err);
    }
  }
}

const lastSent = {};

for (let i = 1; i <= 5; i++) {
  const slider = document.getElementById(`servo${i}`);
  const valSpan = document.getElementById(`val-${i}`);

  if (slider) {
    slider.addEventListener('input', (e) => {
      stopDance();
      valSpan.innerText = e.target.value;
      window.armState[i] = Number(e.target.value);
      // při tažení posíláme nejvýš ~15× za sekundu, ať se nezahltí sériová linka
      const now = Date.now();
      if (!lastSent[i] || now - lastSent[i] >= 60) {
        lastSent[i] = now;
        sendServoCommand(i, e.target.value);
      }
    });
    // po puštění posuvníku se vždy pošle přesná koncová hodnota
    slider.addEventListener('change', (e) => {
      lastSent[i] = Date.now();
      sendServoCommand(i, e.target.value);
    });
  }
}

const btnOpen = document.getElementById('btn-open');
const btnClose = document.getElementById('btn-close');

if (btnOpen) {
  btnOpen.addEventListener('click', () => {
    stopDance();
    sendServoCommand(0, 60);
  });
}

if (btnClose) {
  btnClose.addEventListener('click', () => {
    stopDance();
    sendServoCommand(0, 100);
  });
}

// Posuvníky ukážou aktuální pózu (po resetu a během tance)
function syncSliders() {
  for (let i = 1; i <= 5; i++) {
    const slider = document.getElementById(`servo${i}`);
    const valSpan = document.getElementById(`val-${i}`);
    if (slider) slider.value = window.armState[i];
    if (valSpan) valSpan.innerText = window.armState[i];
  }
}

// Výchozí pozice: simulace i robot (příkaz r)
const btnReset = document.getElementById('btn-reset');
if (btnReset) {
  btnReset.addEventListener('click', async () => {
    stopDance();
    window.armState = [...DEFAULT_POSE];
    syncSliders();
    if (writer) {
      try { await writer.write("r\n"); } catch (err) { console.error("Reset se nepodařilo odeslat: ", err); }
    }
  });
}

// Tanec – stejná sekvence jako zahrajTanec() ve firmwaru, ale jen v simulaci
// (robot tančí po stisku obou tlačítek joysticků)
const DANCE = [
  [60, 90, 90, 130, 140, 90, 6], [130, 45, 135, 60, 60, 150, 7], [60, 135, 45, 120, 120, 30, 5],
  ...Array(4).fill([[130, 40, 140, 110, 90, 90, 4], [60, 140, 40, 70, 90, 90, 4]]).flat(),
  [130, 120, 60, 140, 150, 140, 8], [60, 60, 120, 50, 60, 40, 8], [60, 90, 90, 130, 120, 90, 6],
  ...Array(5).fill([[130, 90, 90, 130, 120, 90, 3], [60, 90, 90, 130, 120, 90, 3]]).flat(),
  [130, 100, 150, 0, 180, 70, 8],
];
let dancing = false;
const btnDance = document.getElementById('btn-dance');

function stopDance() {
  dancing = false;
  if (btnDance) btnDance.innerText = "💃 Tanec (jen simulace)";
}

async function dance() {
  dancing = true;
  btnDance.innerText = "⏹ Zastavit tanec";
  while (dancing) {
    for (const step of DANCE) {
      const target = step.slice(0, 6);
      const stepDelay = step[6];
      // jako moveStep(): každé servo se posune o 1° za krok
      while (dancing && target.some((t, i) => window.armState[i] !== t)) {
        window.armState = window.armState.map((v, i) => v + Math.sign(target[i] - v));
        syncSliders();
        await new Promise((r) => setTimeout(r, stepDelay + 4));
      }
      if (!dancing) return;
    }
  }
}

if (btnDance) {
  btnDance.addEventListener('click', () => (dancing ? stopDance() : dance()));
}

const copyBtn = document.getElementById('copy-code-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    const codeText = document.getElementById('arduino-code').innerText;
    navigator.clipboard.writeText(codeText);
    alert('Kód byl zkopírován do schránky!');
  });
}
