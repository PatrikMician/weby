let port = null;
let writer = null;
let writableStreamClosed = null;

const connectBtn = document.getElementById('connect-btn');
const statusText = document.getElementById('status-text');
const supported = "serial" in navigator;

if (!supported) {
  alert("Váš prohlížeč nepodporuje rozhraní Web Serial API. Použijte nejnovější Google Chrome nebo Microsoft Edge.");
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

  const inputs = document.querySelectorAll('.control-panel input, .control-panel button');
  inputs.forEach(input => input.disabled = !isConnected);
}

async function sendServoCommand(servoId, angle) {
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
      valSpan.innerText = e.target.value;
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
    sendServoCommand(0, 100);
  });
}

if (btnClose) {
  btnClose.addEventListener('click', () => {
    sendServoCommand(0, 60);
  });
}

const copyBtn = document.getElementById('copy-code-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    const codeText = document.getElementById('arduino-code').innerText;
    navigator.clipboard.writeText(codeText);
    alert('Kód byl zkopírován do schránky!');
  });
}
