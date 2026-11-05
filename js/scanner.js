let scanner = null;
let scannerAttivo = false;

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("btnScanner").addEventListener("click", function () {
        if (scannerAttivo) {
            fermaScanner();
        } else {
            avviaScanner();
        }
    });
});

async function avviaScanner() {
    const reader = document.getElementById("reader");
    const pulsante = document.getElementById("btnScanner");

    if (typeof Html5Qrcode === "undefined") {
        alert("Libreria scanner non disponibile.");
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Fotocamera non disponibile. Apri ABA Terminal tramite HTTPS.");
        return;
    }

    reader.style.display = "block";
    reader.innerHTML = "";
    pulsante.textContent = "⏹ CHIUDI SCANNER";

    scanner = new Html5Qrcode("reader");
    scannerAttivo = true;

    const configurazione = {
        fps: 10,
        qrbox: { width: 280, height: 180 },
        formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
        ]
    };

    try {
        let fotocamere = await Html5Qrcode.getCameras();

        if (!scannerAttivo) return;

        if (fotocamere && fotocamere.length > 0) {
            let posteriore = fotocamere.find(c =>
                /back|rear|environment|posteriore/i.test(c.label)
            );

            let camera = posteriore || fotocamere[fotocamere.length - 1];

            await scanner.start(
                camera.id,
                configurazione,
                acquisizioneRiuscita,
                function () {}
            );
        } else {
            await scanner.start(
                { facingMode: "environment" },
                configurazione,
                acquisizioneRiuscita,
                function () {}
            );
        }

    } catch (errore) {
        scannerAttivo = false;
        reader.style.display = "none";
        pulsante.textContent = "📷 SCANSIONA";

        if (scanner) {
            try {
                await scanner.clear();
            } catch (e) {}
            scanner = null;
        }

        alert("ERRORE FOTOCAMERA:\n\n" + errore);
    }
}

function acquisizioneRiuscita(testo) {
    if (!scannerAttivo) return;

    vibra();

    const dati = interpretaCodice(testo);

    document.getElementById("barcode").value = dati.barcode || "";
    document.getElementById("modello").value = dati.modello || "";
    document.getElementById("matricola").value = dati.matricola || "";

    fermaScanner();

    if (dati.tipo === "qr-json") {
        alert(
            "QR acquisito.\n\n" +
            "Modello: " + (dati.modello || "-") + "\n" +
            "Matricola: " + (dati.matricola || "-") + "\n" +
            "Codice prodotto: " + (dati.barcode || "-")
        );
    }
}

function interpretaCodice(testo) {
    const risultato = {
        tipo: "codice",
        barcode: testo.trim(),
        modello: "",
        matricola: ""
    };

    let dati;

    try {
        dati = JSON.parse(testo);
    } catch (e) {
        return risultato;
    }

    risultato.tipo = "qr-json";

    const m = dati && dati.macc ? dati.macc : {};

    risultato.modello = primoValore([
        m.mod, dati.mod, m.model, dati.model
    ]);

    risultato.matricola = primoValore([
        m.matr, dati.matr, m.serial, dati.serial
    ]);

    risultato.barcode = primoValore([
        m.code, dati.code, m.productCode, dati.productCode
    ]);

    if (!risultato.barcode && m.crt) {
        risultato.barcode = primoValore([
            m.crt.code,
            m.crt.cod,
            m.crt.productCode,
            m.crt.cusdis,
            m.crt.opedis
        ]);
    }

    if (!risultato.barcode) {
        risultato.barcode = testo.trim();
    }

    return risultato;
}

function primoValore(valori) {
    for (let i = 0; i < valori.length; i++) {
        if (
            valori[i] !== undefined &&
            valori[i] !== null &&
            String(valori[i]).trim() !== ""
        ) {
            return String(valori[i]).trim();
        }
    }

    return "";
}

function vibra() {
    try {
        if ("vibrate" in navigator) {
            navigator.vibrate([120, 60, 120]);
        }
    } catch (e) {}
}

async function fermaScanner() {
    const reader = document.getElementById("reader");
    const pulsante = document.getElementById("btnScanner");

    scannerAttivo = false;

    if (scanner) {
        try {
            await scanner.stop();
        } catch (e) {}

        try {
            await scanner.clear();
        } catch (e) {}

        scanner = null;
    }

    reader.innerHTML = "";
    reader.style.display = "none";
    pulsante.textContent = "📷 SCANSIONA";
}
