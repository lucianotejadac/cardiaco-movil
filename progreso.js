/* Ventana emergente de progreso para las reconstrucciones (FBP del registro y OSEM). Muestra
   que se esta calculando, una barra con el porcentaje, la etapa y un boton «Detener». Mientras
   esta abierta no se puede tocar el resto de la pagina; no se cierra tocando fuera ni con la
   tecla atras, solo al terminar o con «Detener». */
'use strict';
const Progreso=(()=>{
 const $=id=>document.getElementById(id);
 let alDetener=null,t0=0,maximo=0;
 function abrir(titulo,detener,nota){
  const d=$('dProgreso');alDetener=detener||null;t0=performance.now();
  $('progTitulo').textContent=titulo;$('progNota').textContent=nota||'';$('progNota').hidden=!nota;
  $('progDetener').hidden=!detener;$('progDetener').disabled=false;
  maximo=0;avance(0,'Preparando…');
  if(!d.open)d.showModal();
 }
 // f entre 0 y 1; null deja la barra en movimiento, sin porcentaje (etapa sin medida).
 function avance(f,texto){
  const b=$('progBarra');
  if(f===null||!Number.isFinite(f)){b.removeAttribute('value');$('progPorcentaje').textContent='';}
  // La barra no retrocede: con varios trabajadores los avisos llegan desordenados.
  else{const q=Math.max(maximo,Math.max(0,Math.min(1,f)));maximo=q;b.value=q;$('progPorcentaje').textContent=Math.round(q*100)+' %';}
  if(texto!==undefined)$('progTexto').textContent=texto;
  const s=Math.round((performance.now()-t0)/1000);$('progTiempo').textContent=s>=2?`${s} s`:'';
 }
 function cerrar(){const d=$('dProgreso');if(d.open)d.close();alDetener=null;}
 function iniciar(){
  const d=$('dProgreso');
  d.addEventListener('cancel',e=>e.preventDefault());
  $('progDetener').addEventListener('click',()=>{if(!alDetener)return;$('progDetener').disabled=true;$('progTexto').textContent='Deteniendo…';const f=alDetener;alDetener=null;f();cerrar();});
 }
 return {abrir,avance,cerrar,iniciar};
})();
window.Progreso=Progreso;
