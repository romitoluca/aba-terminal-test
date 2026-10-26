function esportaCSV(){
if(!articoli||articoli.length===0){alert("Nessun articolo da esportare.");return}
let csv="Barcode;Modello;Matricola;Quantita\r\n";
articoli.forEach(function(a){csv+=csvCampo(a.barcode)+";"+csvCampo(a.modello)+";"+csvCampo(a.matricola)+";"+String(a.quantita||1)+"\r\n"});
const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
const url=URL.createObjectURL(blob),link=document.createElement("a");
const d=new Date(),nome=d.getFullYear()+("0"+(d.getMonth()+1)).slice(-2)+("0"+d.getDate()).slice(-2)+"_"+("0"+d.getHours()).slice(-2)+("0"+d.getMinutes()).slice(-2);
link.href=url;link.download="Inventario_"+nome+".csv";document.body.appendChild(link);link.click();document.body.removeChild(link);
setTimeout(function(){URL.revokeObjectURL(url)},1000);
}
function csvCampo(v){const t=String(v??"");if(t.includes(";")||t.includes('"')||t.includes("\r")||t.includes("\n"))return '"'+t.replaceAll('"','""')+'"';return t}
