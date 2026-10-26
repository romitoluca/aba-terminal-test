let scanner=null;
let scannerAttivo=false;

document.addEventListener("DOMContentLoaded",function(){
    document.getElementById("btnScanner").addEventListener("click",function(){
        if(scannerAttivo)fermaScanner();
        else avviaScanner();
    });
});

function avviaScanner(){
    const reader=document.getElementById("reader");
    const pulsante=document.getElementById("btnScanner");

    if(typeof Html5Qrcode==="undefined"){
        alert("Libreria scanner non disponibile. Controlla la connessione Internet.");
        return;
    }

    reader.style.display="block";
    reader.innerHTML="";
    pulsante.textContent="⏹ CHIUDI SCANNER";
    scanner=new Html5Qrcode("reader");
    scannerAttivo=true;

    scanner.start({facingMode:"environment"},{        
        fps:10,
        qrbox:{width:280,height:180},
        formatsToSupport:[
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
    },function(testo){acquisizioneRiuscita(testo)},function(){})
    .catch(function(e){
        scannerAttivo=false;
        reader.style.display="none";
        pulsante.textContent="📷 SCANSIONA";
        alert("Impossibile aprire la fotocamera.\n\n"+e);
    });
}

function acquisizioneRiuscita(testo){
    if(!scannerAttivo)return;
    vibra();

    const risultato=interpretaCodice(testo);
    document.getElementById("barcode").value=risultato.barcode||"";
    document.getElementById("modello").value=risultato.modello||"";
    document.getElementById("matricola").value=risultato.matricola||"";

    fermaScanner();

    if(risultato.tipo==="qr-json"){
        alert("QR acquisito.\n\nModello: "+(risultato.modello||"-")+
              "\nMatricola: "+(risultato.matricola||"-")+
              "\nCodice prodotto: "+(risultato.barcode||"-"));
    } else if(risultato.tipo==="testo-strutturato"){
        alert("Codice acquisito.\n\nModello: "+(risultato.modello||"-")+
              "\nMatricola: "+(risultato.matricola||"-")+
              "\nCodice prodotto: "+(risultato.barcode||"-")+
              "\n\nControlla i campi prima di aggiungere l'articolo.");
    }
}

/*
 * Gestisce diversi formati di fornitori:
 * - JSON valido o quasi-JSON con campi mod/matr/code;
 * - testo strutturato del tipo "RT-30 NERA 3CEAM113584 9911041";
 * - formati sconosciuti, conservati integralmente nel campo Barcode/Codice prodotto.
 */
function interpretaCodice(testo){
    const originale=String(testo==null?"":testo).trim();
    const risultato={
        tipo:"codice",
        barcode:originale,
        modello:"",
        matricola:"",
        originale:originale
    };
    if(!originale)return risultato;

    const sembraJSON=originale.charAt(0)==="{" || /"macc"\s*:|"matr"\s*:|"mod"\s*:/.test(originale);
    if(sembraJSON){
        const dati=estraiCampiJSON(originale);
        if(dati.modello||dati.matricola||dati.barcode){
            risultato.tipo="qr-json";
            risultato.modello=dati.modello;
            risultato.matricola=dati.matricola;
            // Per l'inventario usiamo il codice prodotto, se riconosciuto.
            // Se non c'è, manteniamo il QR completo per non perdere dati.
            risultato.barcode=dati.barcode||originale;
            return risultato;
        }
        // QR simile a JSON ma non riconosciuto: non lo scartiamo.
        return risultato;
    }

    const testoStrutturato=interpretaTestoFornitore(originale);
    if(testoStrutturato){
        risultato.tipo="testo-strutturato";
        risultato.modello=testoStrutturato.modello;
        risultato.matricola=testoStrutturato.matricola;
        risultato.barcode=testoStrutturato.barcode;
    }
    // Codici con separatori + e altri formati non noti restano intatti.
    return risultato;
}

function estraiCampiJSON(testo){
    let j=null;
    try{j=JSON.parse(testo)}catch(e){/* Prosegui con estrazione tollerante. */}

    const m=j&&j.macc&&typeof j.macc==="object"?j.macc:{};
    let modello=primoValore([m.mod,j&&j.mod,m.model,j&&j.model]);
    let matricola=primoValore([m.matr,j&&j.matr,m.serial,j&&j.serial]);
    let barcode=primoValore([
        j&&j.code,m.code,j&&j.productCode,m.productCode,
        j&&j.barcode,m.barcode
    ]);

    // Estrazione di emergenza per QR simili a JSON ma con virgolette/virgole errate.
    // Cerca solo chiavi note, senza richiedere che l'intero testo sia JSON valido.
    if(!modello)modello=valoreChiave(testo,["mod","model"]);
    if(!matricola)matricola=valoreChiave(testo,["matr","serial","serialNumber"]);
    if(!barcode)barcode=valoreChiave(testo,["code","productCode","barcode"]);

    return {modello:modello,matricola:matricola,barcode:barcode};
}

function valoreChiave(testo,chiavi){
    for(let i=0;i<chiavi.length;i++){
        const chiave=chiavi[i].replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
        const regex=new RegExp('["\\\\]?'+chiave+'["\\\\]?\\s*:\\s*["\\\\]?([^,"\\\\}\\s]+)',"i");
        const match=testo.match(regex);
        if(match&&match[1])return match[1].trim();
    }
    return "";
}

function interpretaTestoFornitore(testo){
    /*
     * Formato testuale riconosciuto quando la struttura è abbastanza chiara:
     * modello, eventuale descrizione/colore, matricola alfanumerica e codice numerico.
     * Non prova a interpretare stringhe con separatori + o altri formati sconosciuti.
     */
    if(testo.indexOf("+")!==-1 || testo.indexOf("{")!==-1)return null;

    const parti=testo.split(/\s+/).filter(Boolean);
    if(parti.length<3)return null;

    // Il modello deve somigliare a un modello alfanumerico con trattino, es. RT-30.
    const modelloIndex=parti.findIndex(function(p){return /^[A-Z]{1,8}-[A-Z0-9]+$/i.test(p)});
    if(modelloIndex<0)return null;

    // La matricola deve contenere lettere e numeri; il codice prodotto finale è numerico.
    let indiceMatricola=-1;
    for(let i=modelloIndex+1;i<parti.length-1;i++){
        if(/[A-Z]/i.test(parti[i])&&/\d/.test(parti[i])){
            indiceMatricola=i;
            break;
        }
    }
    if(indiceMatricola<0)return null;

    const ultimo=parti[parti.length-1];
    if(!/^\d{4,}$/.test(ultimo))return null;

    return {
        modello:parti[modelloIndex],
        matricola:parti[indiceMatricola],
        barcode:ultimo
    };
}

function primoValore(valori){
    for(let i=0;i<valori.length;i++){
        if(valori[i]!==undefined&&valori[i]!==null&&String(valori[i]).trim()!==""){
            return String(valori[i]).trim();
        }
    }
    return "";
}

function vibra(){
    try{if("vibrate"in navigator)navigator.vibrate([120,60,120])}catch(e){}
}

function fermaScanner(){
    const reader=document.getElementById("reader");
    const pulsante=document.getElementById("btnScanner");

    if(!scanner){
        scannerAttivo=false;
        reader.style.display="none";
        pulsante.textContent="📷 SCANSIONA";
        return;
    }

    scannerAttivo=false;
    scanner.stop().catch(function(){}).finally(function(){
        scanner.clear().catch(function(){});
        scanner=null;
        reader.innerHTML="";
        reader.style.display="none";
        pulsante.textContent="📷 SCANSIONA";
    });
}
