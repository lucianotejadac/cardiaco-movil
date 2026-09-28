/* Paso de OSEM de la version movil. Al entrar reconstruye la OSEM de referencia del tutorial de
   escritorio de spect-lab-95 (OSEM 2D por cortes, 1 x 1, sin correcciones, inicio uniforme).
   Despues el estudiante arma otras: iteraciones, subconjuntos, correccion de atenuacion con el
   mapa mu del CT registrado y filtro gaussiano final; la receta del caso es 2 x 8 con 8,4 mm,
   sin y con atenuacion. Las reconstrucciones quedan en un historial y se comparan de a dos, lado
   a lado, con la misma escala. Usa el mismo codigo del escritorio, copiado tal cual:
   algorithm.js, simulador95-osem.js, simulador95-psf.js y simulador95-pool.js. Como en el
   escritorio, la franja sin medicion entra como ceros medidos y, con atenuacion, se asume aire
   fuera del campo transversal del CT y solo se reconstruyen los cortes que el CT cubre. */
'use strict';
const OsemMovil=(()=>{
 const $=id=>document.getElementById(id);
 const dec=(x,d)=>Number(x).toFixed(d).replace('.',',');
 const paleta=v=>{v=Math.max(0,Math.min(1,v));return [255*Math.min(1,v*3),255*Math.max(0,Math.min(1,v*3-1)),255*Math.max(0,v*3-2)];};
 const BASE={scatter:false,scatterSmoothing:false,scatterFwhm:0,scatterWeight:0,scatterWindowScale:0,resolutionRecovery:false,distanceDependent:false,axialRecovery:false,initialization:'uniform'};
 const REFERENCIA={iteraciones:1,subconjuntos:1,ac:false,filtro:false,fwhm:8.4};
 const MAX_HISTORIAL=6;
 const o={s:null,fuente:'',reg:null,mu:null,muClave:'',muCobertura:0,historial:[],a:null,b:null,sig:1,
  plano:'axial',corte:{axial:64,coronal:64,sagital:64},nivel:.5,ancho:1,propia:false,tarea:null,ocupado:false,detenido:false};

 // Mapa mu del CT registrado, con la conversion HU -> mu (cm-1) del escritorio. NaN: sin CT.
 async function prepararMu(avance){
  const r=o.reg,s=o.s,n=s.n,clave=[r.off.join(','),r.ctBytes?.length].join('|');
  if(o.mu&&o.muClave===clave)return o.mu;
  const map=new Float32Array(n*n*n).fill(NaN);let validos=0;
  for(let z=0;z<n;z++){
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){const hu=Lab95.sampleCT(r.ct,Lab95.point(s,x,y,z,r.off));if(!Number.isFinite(hu))continue;const h=Math.max(-1000,Math.min(3000,hu));map[z*n*n+y*n+x]=h<=0?.15*(1+h/1000):.15+.0001*h;validos++;}
   if(z%8===0){avance(z/n);await new Promise(q=>setTimeout(q,0));}
  }
  if(!validos)throw Error('El CT no cubre la matriz del SPECT: revisa el registro.');
  o.mu=map;o.muClave=clave;o.muCobertura=validos/map.length;
  // El mapa se puede mirar como una entrada mas del historial.
  o.historial=o.historial.filter(e=>e.tipo!=='mu');
  const filas=new Set();for(let z=0;z<n;z++){for(let i=0;i<n*n;i++)if(Number.isFinite(map[z*n*n+i])){filas.add(z);break;}}
  o.historial.push({id:'mu',tipo:'mu',etiqueta:'Mapa μ del CT',data:map,filas,escala:.2,resumen:`Mapa de atenuación a 140 keV aproximado (cm⁻¹) desde el CT registrado (${r.off[0]} mm en X, ${r.off[1]} mm en Y). Cubre ${Math.round(o.muCobertura*100)} % de la matriz; azul: sin CT.`});
  return map;
 }

 function osem(s,settings,mu,avance){
  return new Promise((ok,mal)=>{
   const codigo=[createModel.toString(),sampleGrid.toString(),attenuationWeights.toString(),gaussianKernel95.toString(),scatterBlur95.toString(),createPsfView95.toString(),'('+osem95Worker.toString()+')()'].join('\n');
   const t=createOsem95Pool(codigo);o.tarea=t;
   t.onerror=err=>{t.terminate();o.tarea=null;mal(Error(err.message||'Error del cálculo.'));};
   t.onmessage=({data:q})=>{
    if(q.error){t.terminate();o.tarea=null;mal(Error(q.error));return;}
    if(q.progress){avance(q.total?q.completed/q.total:0,q.progress);return;}
    if(q.volume){t.terminate();o.tarea=null;ok(q);}
   };
   t.postMessage({n:s.n,data:s.data,views:s.views,spacing:s.spacing,window:1,scatterWindow:2,settings,mu,fbp:null,outsideAir:true});
  });
 }
 function cancelar(){if(o.tarea){o.tarea.terminate();o.tarea=null;o.detenido=true;}o.ocupado=false;$('osemCorrer').disabled=false;$('osemDetener').hidden=true;}

 const receta=x=>`OSEM ${x.iteraciones} × ${x.subconjuntos} ${x.ac?'con':'sin'} atenuación${x.filtro?`, gaussiano ${dec(x.fwhm,1)} mm`:', sin filtro'}`;
 async function reconstruir(x){
  if(o.ocupado)return null;o.ocupado=true;o.detenido=false;$('osemCorrer').disabled=true;$('osemDetener').hidden=false;
  const aviso=$('osemEstado'),s=o.s,t0=performance.now();
  try{
   if(64%x.subconjuntos)throw Error('Los subconjuntos deben dividir las 64 vistas.');
   aviso.className='estado';
   let mu=null;
   if(x.ac){$('osemAviso').textContent='La corrección de atenuación calcula, para cada una de las 64 vistas, cuánto tejido atraviesa cada punto: puede tardar unos minutos en el teléfono.';mu=await prepararMu(f=>{aviso.textContent=`Preparando el mapa μ desde el CT registrado… ${Math.round(f*100)} %`;});if(o.s!==s)return null;}
   const settings={...BASE,iterations:x.iteraciones,subsets:x.subconjuntos,attenuationCorrection:x.ac,postFilter:x.filtro,postFilterFWHMmm:x.fwhm};
   aviso.textContent=`${receta(x)}… 0 %`;
   const q=await osem(s,settings,mu,(f,texto)=>{aviso.textContent=`${receta(x)}… ${Math.round(f*100)} %${x.ac&&/AC/.test(texto)?' (preparando la atenuación de cada vista)':''}`;});
   if(o.s!==s)return null;
   let data=q.volume;
   if(x.filtro){aviso.textContent=`${receta(x)}: aplicando el gaussiano final…`;data=await Lab95.gaussian3D(q.volume,s.n,x.fwhm/s.spacing/2.354820045,()=>o.s!==s);if(!data)return null;}
   const muestra=[];for(let i=0;i<data.length;i+=7)if(data[i]>0)muestra.push(data[i]);muestra.sort((a,b)=>a-b);
   const segundos=(performance.now()-t0)/1000,num=o.sig++;
   const e={id:'r'+num,tipo:'osem',etiqueta:`${num} · ${x.iteraciones}×${x.subconjuntos}${x.ac?' AC':''}${x.filtro?' G'+dec(x.fwhm,1):''}`,data,filas:new Set(q.rows),escala:muestra[Math.floor(muestra.length*.995)]||1,receta:{...x},segundos,
    resumen:`${receta(x)}, inicio uniforme, proyecciones ${o.fuente}. ${q.rows.length} de ${s.n} cortes${x.ac?' (solo los que cubre el CT; aire fuera de su campo transversal)':''}. Tomó ${dec(segundos,1)} s.`};
   o.historial.push(e);
   // Se conservan la referencia, el mapa mu y las ultimas reconstrucciones.
   while(o.historial.filter(h=>h.tipo==='osem').length>MAX_HISTORIAL){const i=o.historial.findIndex(h=>h.tipo==='osem'&&h.id!=='r1'&&h.id!==o.a&&h.id!==o.b);if(i<0)break;o.historial.splice(i,1);}
   aviso.className='estado ok';aviso.textContent=e.resumen;
   return e;
  }catch(err){aviso.className='estado error';aviso.textContent=o.detenido?'Reconstrucción detenida.':'No se pudo reconstruir: '+(err.message||err);if(!o.detenido)console.error(err);return null;}
  finally{o.ocupado=false;$('osemCorrer').disabled=false;$('osemDetener').hidden=true;$('osemAviso').textContent='';}
 }

 async function abrir({s,fuente,cortes,registro}){
  o.reg=registro;
  if(o.s!==s){cancelar();o.s=s;o.fuente=fuente;o.historial=[];o.mu=null;o.muClave='';o.sig=1;o.a=o.b=null;if(cortes)o.corte={...cortes};}
  if(!o.historial.some(e=>e.id==='r1')){const e=await reconstruir(REFERENCIA);if(!e)return false;o.a=e.id;o.b=null;}
  // Si el registro cambio, el mapa mu viejo ya no sirve para nuevas reconstrucciones.
  if(o.mu&&o.muClave!==[o.reg.off.join(','),o.reg.ctBytes?.length].join('|')){o.mu=null;o.historial=o.historial.filter(e=>e.tipo!=='mu');if(o.a==='mu')o.a='r1';if(o.b==='mu')o.b=null;}
  listas();pintar();return true;
 }

 const coords=(u,v,i)=>o.plano==='axial'?[u,v,i]:o.plano==='coronal'?[u,i,v]:[i,u,v];
 const entrada=id=>o.historial.find(e=>e.id===id)||null;
 function listas(){
  for(const [sel,val,vacio] of [['osemA',o.a,false],['osemB',o.b,true]]){
   const el=$(sel);el.replaceChildren();
   if(vacio){const op=document.createElement('option');op.value='';op.textContent='— nada —';el.append(op);}
   for(const e of o.historial){const op=document.createElement('option');op.value=e.id;op.textContent=e.etiqueta;el.append(op);}
   el.value=val||'';
  }
  const a=entrada(o.a),b=entrada(o.b);
  $('osemResumen').textContent=[a,b].filter(Boolean).map((e,i)=>`${i?'Derecha':'Izquierda'}: ${e.resumen}`).join(' ');
 }
 function dibujar(c,e,escala){
  const n=o.s.n,i=o.corte[o.plano];if(c.width!==n){c.width=n;c.height=n;}
  const ctx=c.getContext('2d'),im=ctx.createImageData(n,n);
  for(let v=0;v<n;v++)for(let u=0;u<n;u++){
   const [x,y,z]=coords(u,v,i),j=(v*n+u)*4,val=e.data[z*n*n+y*n+x];
   if(e.tipo==='mu'){const g=Number.isFinite(val)?255*Math.max(0,Math.min(1,val/e.escala)):null;for(let k=0;k<3;k++)im.data[j+k]=g===null?(k===2?60:0):g;}
   else{const valida=e.filas.has(z),col=paleta((val/escala-o.nivel)/o.ancho+.5);for(let k=0;k<3;k++)im.data[j+k]=valida?col[k]:k===2?60:0;}
   im.data[j+3]=255;
  }
  ctx.putImageData(im,0,0);
  const [cx,cy]=o.plano==='axial'?[o.corte.sagital,o.corte.coronal]:o.plano==='coronal'?[o.corte.sagital,o.corte.axial]:[o.corte.coronal,o.corte.axial];
  ctx.fillStyle='rgba(77,208,225,.7)';ctx.fillRect(cx,0,1,n);ctx.fillStyle='rgba(255,238,88,.7)';ctx.fillRect(0,cy,n,1);
 }
 function pintar(){
  const a=entrada(o.a),b=entrada(o.b);if(!a||!o.s)return;
  // Como en el escritorio: las dos OSEM elegidas comparten escala, asi una diferencia de brillo
  // es una diferencia de actividad reconstruida y no de ventana.
  const escala=Math.max(1e-12,...[a,b].filter(e=>e&&e.tipo==='osem').map(e=>e.escala));
  // Con «escala propia» cada una va a su maximo: sirve para comparar la forma cuando la
  // actividad total es muy distinta (con y sin atenuacion).
  dibujar($('osemVistaA'),a,o.propia&&a.tipo==='osem'?a.escala:escala);
  if(b)dibujar($('osemVistaB'),b,o.propia&&b.tipo==='osem'?b.escala:escala);
  $('osemPropia').checked=o.propia;
  else{const c=$('osemVistaB'),n=o.s.n;c.width=n*2;c.height=n*2;const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,n*2,n*2);x.fillStyle='#aab3bd';x.font='15px system-ui';x.textAlign='center';x.fillText('Elige arriba una',n,n-10);x.fillText('para comparar',n,n+12);}
  const n=o.s.n,i=o.corte[o.plano];
  $('osemPlanoTexto').textContent={axial:'Axial',coronal:'Coronal',sagital:'Sagital'}[o.plano];
  $('osemCorte').textContent=`${i+1}/${n}`;$('osemCorteRango').max=n-1;$('osemCorteRango').value=i;
  $('osemNivel').value=Math.round(o.nivel*100);$('osemAncho').value=Math.round(o.ancho*100);
  $('osemVentana').textContent=`muestra de ${Math.round(Math.max(0,o.nivel-o.ancho/2)*100)} % a ${Math.round((o.nivel+o.ancho/2)*100)} %`;
  document.querySelectorAll('[data-oplano]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.oplano===o.plano)));
 }
 // Tocar o arrastrar sobre una imagen elige donde cortan los otros dos planos.
 function tactil(c){
  let activo=false;
  const mover=e=>{
   if(!o.s)return;const r=c.getBoundingClientRect(),n=o.s.n,u=Math.max(0,Math.min(n-1,Math.floor((e.clientX-r.left)/r.width*n))),v=Math.max(0,Math.min(n-1,Math.floor((e.clientY-r.top)/r.height*n)));
   if(o.plano==='axial'){o.corte.sagital=u;o.corte.coronal=v;}else if(o.plano==='coronal'){o.corte.sagital=u;o.corte.axial=v;}else{o.corte.coronal=u;o.corte.axial=v;}
   $('osemCursor').textContent=`Cortes: axial ${o.corte.axial+1}, coronal ${o.corte.coronal+1}, sagital ${o.corte.sagital+1}. Cambia de plano para verlos.`;
   pintar();
  };
  c.addEventListener('pointerdown',e=>{activo=true;try{c.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();mover(e);});
  c.addEventListener('pointermove',e=>{if(activo)mover(e);});
  const soltar=()=>{activo=false;};c.addEventListener('pointerup',soltar);c.addEventListener('pointercancel',soltar);
 }
 function leerOpciones(){return {iteraciones:Math.max(1,Math.min(20,Math.round(+$('osemIter').value||1))),subconjuntos:+$('osemSub').value,ac:$('osemAC').checked,filtro:$('osemFiltro').checked,fwhm:Math.max(1,Math.min(25,+$('osemFwhm').value||8.4))};}
 function ponerOpciones(x){$('osemIter').value=x.iteraciones;$('osemSub').value=String(x.subconjuntos);$('osemAC').checked=x.ac;$('osemFiltro').checked=x.filtro;$('osemFwhm').value=x.fwhm;$('osemFwhm').disabled=!x.filtro;}
 function iniciar(){
  tactil($('osemVistaA'));tactil($('osemVistaB'));
  document.querySelectorAll('[data-oplano]').forEach(b=>b.addEventListener('click',()=>{o.plano=b.dataset.oplano;pintar();}));
  $('osemCorteRango').addEventListener('input',e=>{o.corte[o.plano]=+e.target.value;pintar();});
  $('osemNivel').addEventListener('input',e=>{o.nivel=+e.target.value/100;pintar();});
  $('osemAncho').addEventListener('input',e=>{o.ancho=Math.max(.01,+e.target.value/100);pintar();});
  $('osemInicial').addEventListener('click',()=>{o.nivel=.5;o.ancho=1;pintar();});
  $('osemA').addEventListener('change',e=>{o.a=e.target.value;listas();pintar();});
  $('osemB').addEventListener('change',e=>{o.b=e.target.value||null;listas();pintar();});
  $('osemPropia').addEventListener('change',e=>{o.propia=e.target.checked;pintar();});
  $('osemDetener').addEventListener('click',()=>{cancelar();$('osemEstado').className='estado';$('osemEstado').textContent='Reconstrucción detenida.';});
  $('osemFiltro').addEventListener('change',e=>{$('osemFwhm').disabled=!e.target.checked;});
  $('osemRecetaSin').addEventListener('click',()=>ponerOpciones({iteraciones:CARDIACO_RECETA.iteraciones,subconjuntos:CARDIACO_RECETA.subconjuntos,ac:false,filtro:true,fwhm:CARDIACO_RECETA.filtroMm}));
  $('osemRecetaCon').addEventListener('click',()=>ponerOpciones({iteraciones:CARDIACO_RECETA.iteraciones,subconjuntos:CARDIACO_RECETA.subconjuntos,ac:true,filtro:true,fwhm:CARDIACO_RECETA.filtroMm}));
  $('osemCorrer').addEventListener('click',async()=>{
   const prev=o.a,e=await reconstruir(leerOpciones());if(!e)return;
   // La nueva a la izquierda y, a la derecha, la que se estaba mirando.
   o.a=e.id;o.b=prev&&prev!==e.id?prev:null;listas();pintar();window.scrollTo({top:0,behavior:'smooth'});
  });
  ponerOpciones({iteraciones:CARDIACO_RECETA.iteraciones,subconjuntos:CARDIACO_RECETA.subconjuntos,ac:false,filtro:true,fwhm:CARDIACO_RECETA.filtroMm});
 }
 function olvidar(){cancelar();o.s=null;o.historial=[];o.mu=null;o.muClave='';o.a=o.b=null;o.sig=1;$('osemCursor').textContent='';}
 return {iniciar,abrir,cancelar,olvidar,reconstruir,estado:o};
})();
window.OsemMovil=OsemMovil;
