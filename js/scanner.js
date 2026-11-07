/* ABA TERMINAL - SCANNER
   Barcode standard + QR RT-30 + QR RT-40V2
*/

let scanner = null;
let scannerAttivo = false;
let elaborazioneInCorso = false;

// COLLEGAMENTO PULSANTE SCANNER
document.addEventListener("DOMContentLoaded", function () {
    const pulsante = document.getElementById("btnScanner");

    if (!pulsante) return;

    pulsante.addEventListener("click", function () {
        if (scannerAttivo) {
            fermaScanner();
        } else {
            avviaScanner();
        }
    });
});

// AVVIO FOTOCAMERA
function avviaScanner() {
    const reader = document.getElementById("reader");
    const pulsante = document.getElementById("btnScanner");

    if (!reader || !pulsante) return;

    if (typeof Html5Qrcode === "undefined") {
        alert("Libreria scanner non disponibile.");
        return;
    }

    reader.style.display = "block";
    reader.innerHTML = "";

    pulsante.textContent = "⏹ CHIUDI SCANNER";

    elaborazioneInCorso = false;
    scanner = new Html5Qrcode("reader");
    scannerAttivo = true;

    const configurazione = {
        fps: 15,

        qrbox: {
            width: 280,
            height: 180
        },

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

    scanner.start(
        { facingMode: "environment" },
        configurazione,

        function (testo) {
            acquisizioneRiuscita(testo);
        },

        function () {
            // Nessuna azione durante la ricerca del codice.
        }

    ).catch(function (errore) {

        scannerAttivo = false;
        scanner = null;

        reader.style.display = "none";
        pulsante.textContent = "📷 SCANSIONA";

        alert(
            "Impossibile aprire la fotocamera.\n\n" +
            errore
        );
    });
}

// GESTIONE LETTURA RIUSCITA
function acquisizioneRiuscita(testo) {

    if (!scannerAttivo || elaborazioneInCorso) return;

    elaborazioneInCorso = true;

    const dati = interpretaCodice(testo);

    const campoBarcode = document.getElementById("barcode");
    const campoModello = document.getElementById("modello");
    const campoMatricola = document.getElementById("matricola");

    if (campoBarcode) {
        campoBarcode.value = dati.barcode || "";
    }

    if (campoModello) {
        campoModello.value = dati.modello || "";
    }

    if (campoMatricola) {
        campoMatricola.value = dati.matricola || "";
    }

    vibra();

    fermaScanner();

    if (
        dati.tipo === "qr-rt30" ||
        dati.tipo === "qr-rt40"
    ) {
        alert(
            "QR acquisito!\n\n" +
            "Modello: " + (dati.modello || "-") + "\n" +
            "Matricola: " + (dati.matricola || "-") + "\n" +
            "Codice prodotto: " + (dati.barcode || "-")
        );
    }
}

// INTERPRETAZIONE DEI CODICI
function interpretaCodice(testo) {

    const originale = String(testo || "").trim();

    const risultato = {
        tipo: "barcode",
        barcode: originale,
        modello: "",
        matricola: ""
    };

    if (!originale) return risultato;

    // --------------------------------
    // FORMATO RT-30 NERA
    // Esempio:
    // RT-30 NERA 3CEAM114880 9911044
    // --------------------------------

    const rt30 = originale.match(
        /^(RT-30\s+.+?)\s+([A-Z0-9]{6,})\s+(\d{5,})$/i
    );

    if (rt30) {

        risultato.tipo = "qr-rt30";
        risultato.modello = rt30[1].trim();
        risultato.matricola = rt30[2].trim();
        risultato.barcode = rt30[3].trim();

        return risultato;
    }

    // --------------------------------
    // FORMATO RT-40V2
    // Non utilizziamo JSON.parse perché
    // alcuni QR contengono JSON malformato.
    // --------------------------------

    const modello = estraiCampo(originale, "mod");
    const matricola = estraiCampo(originale, "matr");
    const codice = estraiCampo(originale, "code");

    if (modello || matricola || codice) {

        risultato.tipo = "qr-rt40";

        risultato.modello = modello;
        risultato.matricola = matricola;

        // IMPORTANTE:
        // Il codice prodotto viene preso esclusivamente
        // dal campo "code", mai dalla matricola.

        risultato.barcode = codice;

        return risultato;
    }

    // BARCODE STANDARD
    return risultato;
}

// ESTRAZIONE CAMPI DAL QR
function estraiCampo(testo, nomeCampo) {

    const chiave = nomeCampo.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

    const regex = new RegExp(
        '"' + chiave + '"\\s*:\\s*"([^"]*)"',
        "i"
    );

    const corrispondenza = testo.match(regex);

    return corrispondenza
        ? corrispondenza[1].trim()
        : "";
}

// VIBRAZIONE
function vibra() {

    try {
        if ("vibrate" in navigator) {
            navigator.vibrate([120, 60, 120]);
        }
    } catch (errore) {
        // Vibrazione non disponibile.
    }
}

// ARRESTO SCANNER
function fermaScanner() {

    const reader = document.getElementById("reader");
    const pulsante = document.getElementById("btnScanner");

    scannerAttivo = false;

    if (!scanner) {

        if (reader) {
            reader.innerHTML = "";
            reader.style.display = "none";
        }

        if (pulsante) {
            pulsante.textContent = "📷 SCANSIONA";
        }

        return;
    }

    const scannerDaFermare = scanner;

    scanner = null;

    scannerDaFermare.stop()

        .catch(function () {
            // Scanner già fermato.
        })

        .finally(function () {

            try {
                scannerDaFermare.clear();
            } catch (errore) {
                // Nessuna azione necessaria.
            }

            if (reader) {
                reader.innerHTML = "";
                reader.style.display = "none";
            }

            if (pulsante) {
                pulsante.textContent = "📷 SCANSIONA";
            }
        });
}
