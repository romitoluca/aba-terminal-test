let articoli=[];

document.addEventListener("DOMContentLoaded",function(){
document.getElementById("btnPiu").addEventListener("click",aumentaQuantita);
document.getElementById("btnMeno").addEventListener("click",diminuisciQuantita);
document.getElementById("btnAggiungi").addEventListener("click",aggiungiArticolo);
document.getElementById("btnEsporta").addEventListener("click",esportaCSV);
aggiornaLista();
});

function aumentaQuantita(){const c=document.getElementById("quantita");c.value=parseInt(c.value||"1",10)+1}
function diminuisciQuantita(){const c=document.getElementById("quantita");const v=parseInt(c.value||"1",10);if(v>1)c.value=v-1}

function aggiungiArticolo(){
const barcode=document.getElementById("barcode").value.trim();
const modello=document.getElementById("modello").value.trim();
const matricola=document.getElementById("matricola").value.trim();
const quantita=parseInt(document.getElementById("quantita").value||"1",10);
if(!barcode&&!matricola){alert("Inserisci almeno il codice prodotto/barcode oppure la matricola.");return}
articoli.push({barcode,modello,matricola,quantita});
aggiornaLista();
document.getElementById("barcode").value="";
document.getElementById("modello").value="";
document.getElementById("matricola").value="";
document.getElementById("quantita").value=1;
document.getElementById("barcode").focus();
}

function aggiornaLista(){
const lista=document.getElementById("listaArticoli");
if(articoli.length===0){lista.innerHTML='<div class="vuoto">Nessun articolo acquisito</div>';return}
lista.innerHTML="";
articoli.forEach(function(a,i){
const e=document.createElement("div");e.className="articolo";
e.innerHTML=`<div><b>Codice:</b> ${escapeHtml(a.barcode||"-")}</div><div><b>Modello:</b> ${escapeHtml(a.modello||"-")}</div><div><b>Matricola:</b> ${escapeHtml(a.matricola||"-")}</div><div><b>Quantità:</b> ${a.quantita}</div><button class="btnElimina" type="button">ELIMINA</button>`;
e.querySelector(".btnElimina").addEventListener("click",function(){eliminaArticolo(i)});
lista.appendChild(e);
});
}
function eliminaArticolo(i){articoli.splice(i,1);aggiornaLista()}
function escapeHtml(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
