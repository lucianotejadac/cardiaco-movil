/* Tablet apaisada: cada paso se reparte en dos columnas. A la izquierda las imagenes (el lienzo),
   a la derecha los controles, textos y botones (el panel), que quedan fijos en pantalla con su
   propio desplazamiento. En pantallas angostas se devuelve todo a su orden original. */
'use strict';
const Apaisado=(()=>{
 const MQ=matchMedia('(min-width: 900px)');
 // Por seccion: que va a la izquierda (izq) o, si es mas corto de decir, que va a la derecha (der).
 const REPARTO={
  qc:{izq:['#rejilla']},
  reg:{izq:['figure.fusion']},
  osem:{izq:['#osemRejilla']},
  gat:{izq:['figure.rango','#gatCine']},
  cmp:{izq:[':scope > .rejilla']},
  caja:{izq:[':scope > .rejilla',':scope > .refProy']},
  reo:{izq:[':scope > .rejilla',':scope > #reoEq',':scope > .refProy']},
  qps:{der:[':scope > .saberMas','#volverQps',':scope > .columna','#qpsTipo','#qpsEstado','#qpsAviso',':scope > .controles.fijo','#qpsEje','#qpsReceta','#qpsTablaT','#qpsTabla','#qpsRevelar','#qpsReferencia','#a7Qgs','#qpsFase',':scope > .vermas']},
  qgs7:{der:[':scope > .saberMas','#volverQgs',':scope > .columna','#qgsFase','#qgsEstado','#qgsTablaT','#qgsTabla','#qgsRevelar','#qgsNota']},
  pantallas7:{izq:['figure.pantalla']}
 };
 const secciones={};let activo=false;
 function preparar(){
  for(const id in REPARTO){
   const s=document.getElementById(id);if(!s)continue;
   const orden=[...s.children],reglas=REPARTO[id],marca=new Set();
   for(const sel of (reglas.izq||reglas.der))s.querySelectorAll(sel).forEach(e=>{if(e.parentElement===s)marca.add(e);});
   const lienzo=document.createElement('div'),panel=document.createElement('div');lienzo.className='lienzo';panel.className='panel';
   secciones[id]={s,orden,lienzo,panel,izq:e=>reglas.izq?marca.has(e):!marca.has(e)};
  }
 }
 function aplicar(){
  const quiere=MQ.matches;if(quiere===activo)return;activo=quiere;
  document.body.classList.toggle('apaisado',quiere);
  for(const id in secciones){
   const {s,orden,lienzo,panel,izq}=secciones[id];
   if(quiere){for(const e of orden)(izq(e)?lienzo:panel).append(e);s.append(lienzo,panel);s.classList.add('dividida');}
   else{for(const e of orden)s.append(e);lienzo.remove();panel.remove();s.classList.remove('dividida');}
  }
  medir();document.dispatchEvent(new Event('apaisado'));
 }
 // Al cambiar de paso, el panel vuelve arriba (window.scrollTo no lo alcanza).
 function vigilar(){
  const ob=new MutationObserver(ms=>{for(const m of ms){const s=m.target;if(!s.classList.contains('oculta')&&secciones[s.id])secciones[s.id].panel.scrollTop=0;}});
  for(const id in secciones)ob.observe(secciones[id].s,{attributes:true,attributeFilter:['class']});
 }
 // Alto de la barra y de los pasos: el panel usa el resto de la pantalla.
 function medir(){const b=document.querySelector('.barra'),p=document.getElementById('pasos7');const h=(b?b.offsetHeight:0)+(p&&!p.hidden?p.offsetHeight:0)+8;document.documentElement.style.setProperty('--arriba',h+'px');}
 function iniciar(){preparar();aplicar();vigilar();medir();MQ.addEventListener('change',aplicar);addEventListener('resize',medir);const p=document.getElementById('pasos7');if(p)new MutationObserver(medir).observe(p,{attributes:true,attributeFilter:['hidden']});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
 return {get activo(){return activo;}};
})();
