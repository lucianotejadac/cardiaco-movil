/* Paso de OSEM de la version movil. Con el registro confirmado, reconstruye las mismas
   proyecciones de la FBP (corregidas si el estudiante corrigio) con la OSEM de referencia del
   tutorial de escritorio de spect-lab-95: OSEM 2D por cortes, 1 iteracion y 1 subconjunto, sin
   correccion de atenuacion, sin dispersion, sin recuperacion de resolucion, sin filtro final y
   partiendo de una imagen uniforme. Usa el mismo codigo del escritorio, copiado tal cual:
   algorithm.js (proyector), simulador95-osem.js (worker), simulador95-psf.js (funciones que el
   worker necesita definidas) y simulador95-pool.js (reparte los cortes entre trabajadores).
   Como en el escritorio, la franja sin medicion entra como ceros medidos. */
'use strict';
const OsemMovil=(()=>{
 const $=id=>document.getElementById(id);
 const dec=(x,d)=>Number(x).toFixed(d).replace('.',',');
 const paleta=v=>{v=Math.max(0,Math.min(1,v));return [255*Math.min(1,v*3),255*Math.max(0,Math.min(1,v*3-1)),255*Math.max(0,v*3-2)];};
 // Las mismas opciones que prepareBaselineOptions del escritorio: todo apagado, 1 x 1.
 const RECETA={iterations:1,subsets:1,attenuationCorrection:false,scatter:false,scatterSmoothing:false,scatterFwhm:0,scatterWeight:0,scatterWindowScale:0,
  resolutionRecovery:false,distanceDependent:false,axialRecovery:false,postFilter:false,postFilterFWHMmm:0,initialization:'uniform'};
 const o={s:null,vol:null,escala:1,filas:null,plano:'axial',corte:{axial:64,coronal:64,sagital:64},nivel:.5,ancho:1,tarea:null,listo:false,segundos:0};

 function osem(s,avance){
  return new Promise((ok,mal)=>{
   const codigo=[createModel.toString(),sampleGrid.toString(),attenuationWeights.toString(),gaussianKernel95.toString(),scatterBlur95.toString(),createPsfView95.toString(),'('+osem95Worker.toString()+')()'].join('\n');
   const t=createOsem95Pool(codigo);o.tarea=t;
   t.onerror=err=>{t.terminate();o.tarea=null;mal(Error(err.message||'Error del cálculo.'));};
   t.onmessage=({data:q})=>{
    if(q.error){t.terminate();o.tarea=null;mal(Error(q.error));return;}
    if(q.progress){avance(q.total?q.completed/q.total:0);return;}
    if(q.volume){t.terminate();o.tarea=null;ok(q);}
   };
   t.postMessage({n:s.n,data:s.data,views:s.views,spacing:s.spacing,window:1,scatterWindow:2,settings:{...RECETA},mu:null,fbp:null,outsideAir:true});
  });
 }
 function cancelar(){if(o.tarea){o.tarea.terminate();o.tarea=null;}}

 async function abrir({s,fuente,cortes}){
  const aviso=$('osemEstado');
  if(o.s===s&&o.vol){pintar();return true;}
  cancelar();o.listo=false;o.s=s;o.vol=null;
  try{
   aviso.className='estado';aviso.textContent='Reconstruyendo con OSEM 1 × 1… 0 %';
   const t0=performance.now();
   const q=await osem(s,f=>{aviso.textContent=`Reconstruyendo con OSEM 1 × 1… ${Math.round(f*100)} %`;});
   if(o.s!==s)return false;
   o.vol=q.volume;o.filas=new Set(q.rows);o.segundos=(performance.now()-t0)/1000;
   const muestra=[];for(let i=0;i<o.vol.length;i+=7)if(o.vol[i]>0)muestra.push(o.vol[i]);muestra.sort((a,b)=>a-b);o.escala=muestra[Math.floor(muestra.length*.995)]||1;
   if(cortes)o.corte={...cortes};
   o.listo=true;
   aviso.className='estado ok';aviso.textContent=`OSEM 2D por cortes, 1 iteración y 1 subconjunto (64 vistas), sin atenuación, sin dispersión, sin filtro, partiendo de una imagen uniforme. Proyecciones ${fuente}. Tomó ${dec(o.segundos,1)} s con ${q.performance?.workers||1} ${q.performance?.workers===1?'trabajador':'trabajadores'}.`;
   pintar();return true;
  }catch(err){aviso.className='estado error';aviso.textContent='No se pudo reconstruir: '+(err.message||err);console.error(err);return false;}
 }

 const coords=(u,v,i)=>o.plano==='axial'?[u,v,i]:o.plano==='coronal'?[u,i,v]:[i,u,v];
 function pintar(){
  if(!o.listo)return;
  const n=o.s.n,i=o.corte[o.plano],c=$('osemVista');
  if(c.width!==n){c.width=n;c.height=n;}
  const ctx=c.getContext('2d'),im=ctx.createImageData(n,n);
  for(let v=0;v<n;v++)for(let u=0;u<n;u++){
   const [x,y,z]=coords(u,v,i),j=(v*n+u)*4,valida=o.filas.has(z),e=(o.vol[z*n*n+y*n+x]/o.escala-o.nivel)/o.ancho+.5,col=paleta(e);
   for(let k=0;k<3;k++)im.data[j+k]=valida?col[k]:k===2?60:0;im.data[j+3]=255;
  }
  ctx.putImageData(im,0,0);
  // Cruz: donde estan los otros dos cortes en este plano.
  const [cx,cy]=o.plano==='axial'?[o.corte.sagital,o.corte.coronal]:o.plano==='coronal'?[o.corte.sagital,o.corte.axial]:[o.corte.coronal,o.corte.axial];
  ctx.fillStyle='rgba(77,208,225,.7)';ctx.fillRect(cx,0,1,n);ctx.fillStyle='rgba(255,238,88,.7)';ctx.fillRect(0,cy,n,1);
  $('osemPlanoTexto').textContent={axial:'Axial',coronal:'Coronal',sagital:'Sagital'}[o.plano];
  $('osemCorte').textContent=`${i+1}/${n}`;$('osemCorteRango').max=n-1;$('osemCorteRango').value=i;
  $('osemNivel').value=Math.round(o.nivel*100);$('osemAncho').value=Math.round(o.ancho*100);
  $('osemVentana').textContent=`muestra de ${Math.round(Math.max(0,o.nivel-o.ancho/2)*100)} % a ${Math.round((o.nivel+o.ancho/2)*100)} %`;
  document.querySelectorAll('[data-oplano]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.oplano===o.plano)));
 }
 // Tocar o arrastrar sobre la imagen cambia el corte de los otros dos planos, como un cursor.
 function tactil(c){
  let activo=false;
  const mover=e=>{
   if(!o.listo)return;const r=c.getBoundingClientRect(),n=o.s.n,u=Math.max(0,Math.min(n-1,Math.floor((e.clientX-r.left)/r.width*n))),v=Math.max(0,Math.min(n-1,Math.floor((e.clientY-r.top)/r.height*n)));
   if(o.plano==='axial'){o.corte.sagital=u;o.corte.coronal=v;}else if(o.plano==='coronal'){o.corte.sagital=u;o.corte.axial=v;}else{o.corte.coronal=u;o.corte.axial=v;}
   $('osemCursor').textContent=`Cortes: axial ${o.corte.axial+1}, coronal ${o.corte.coronal+1}, sagital ${o.corte.sagital+1}. Cambia de plano para verlos.`;
   pintar();
  };
  c.addEventListener('pointerdown',e=>{activo=true;try{c.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();mover(e);});
  c.addEventListener('pointermove',e=>{if(activo)mover(e);});
  const soltar=()=>{activo=false;};c.addEventListener('pointerup',soltar);c.addEventListener('pointercancel',soltar);
 }
 function iniciar(){
  tactil($('osemVista'));
  document.querySelectorAll('[data-oplano]').forEach(b=>b.addEventListener('click',()=>{o.plano=b.dataset.oplano;pintar();}));
  $('osemCorteRango').addEventListener('input',e=>{o.corte[o.plano]=+e.target.value;pintar();});
  $('osemNivel').addEventListener('input',e=>{o.nivel=+e.target.value/100;pintar();});
  $('osemAncho').addEventListener('input',e=>{o.ancho=Math.max(.01,+e.target.value/100);pintar();});
  $('osemInicial').addEventListener('click',()=>{o.nivel=.5;o.ancho=1;pintar();});
 }
 function olvidar(){cancelar();o.s=null;o.vol=null;o.listo=false;$('osemCursor').textContent='';}
 return {iniciar,abrir,cancelar,olvidar,estado:o,RECETA};
})();
window.OsemMovil=OsemMovil;
