/* Paso de registro SPECT/CT de la version movil. Reconstruye con FBP (filtro rampa, fotopico)
   las proyecciones de estres, corregidas si el estudiante ya corrigio, y muestra la fusion con
   el CT del mismo ZIP. El CT parte alineado, tal como lo dejo el equipo (mismo marco de
   referencia): el estudiante revisa la fusion en los tres planos, puede moverlo y confirma. El
   registro se acepta con un residuo de hasta 8 mm por eje (unos dos voxeles). */
'use strict';
const Registro=(()=>{
 const TAM=256,FWHM=8.4,ACEPTABLE=8,EXACTO=3;
 const VENTANAS={contorno:[-400,1000],blando:[40,400],hueso:[450,1800]};
 const $=id=>document.getElementById(id);
 const dec=(x,d)=>Number(x).toFixed(d).replace('.',',');
 const paleta=v=>{v=Math.max(0,Math.min(1,v));return [255*Math.min(1,v*3),255*Math.max(0,Math.min(1,v*3-1)),255*Math.max(0,v*3-2)];};
 const r={s:null,fuente:'',ct:null,ctBytes:null,vol:null,escala:1,off:[0,0,0],plano:'axial',corte:{axial:64,coronal:64,sagital:64},
  mezcla:.6,nivel:.65,ancho:.7,ventana:'contorno',trabajador:null,cache:null,confirmado:null,listo:false};


 // El CT del ZIP: cortes axiales en HU, con el mismo marco de referencia que el SPECT.
 function prepararCT(s,bytes){
  const cortes=bytes.map(b=>Lab95.ct(dicomParser.parseDicom(b)));
  return Lab95.prepareCT(cortes,s);
 }
 // La franja sin medicion (columnas completas en cero en el borde, por los cabezales en L) no es
 // actividad cero: es dato ausente. Con el filtro rampa, el salto de cuentas a cero en su borde se
 // vuelve un pico que la retroproyeccion arrastra por todo el campo, y aparece una banda que sale
 // del cuerpo. Solo para esta reconstruccion preliminar, cada fila de la franja se rellena con la
 // media de las tres columnas medidas vecinas, bajando a cero con un coseno hasta el borde.
 function completarFranja(s){
  const n=s.n,p=n*n,data=s.data.slice();let vistas=0;
  for(let f=0;f<s.frames;f++){
   const o=f*p,vacia=x=>{for(let y=0;y<n;y++)if(data[o+y*n+x]>0)return false;return true;};
   let izq=0;while(izq<n&&vacia(izq))izq++;let der=0;while(der<n-izq&&vacia(n-1-der))der++;
   if(izq+der===0||izq+der>=n-3)continue;vistas++;
   for(let y=0;y<n;y++){
    const fila=o+y*n;
    if(izq){const m=(data[fila+izq]+data[fila+izq+1]+data[fila+izq+2])/3;for(let x=0;x<izq;x++)data[fila+x]=m*.5*(1+Math.cos(Math.PI*(izq-x)/(izq+1)));}
    if(der){const b=n-1-der,m=(data[fila+b]+data[fila+b-1]+data[fila+b-2])/3;for(let x=b+1;x<n;x++)data[fila+x]=m*.5*(1+Math.cos(Math.PI*(x-b)/(der+1)));}
   }
  }
  return {s:{...s,data},vistas};
 }
 function fbp(s,avance){
  return new Promise((ok,mal)=>{
   const url=URL.createObjectURL(new Blob([Lab95.workerSource],{type:'text/javascript'}));const w=new Worker(url);URL.revokeObjectURL(url);r.trabajador=w;r.rechazo=mal;
   w.onerror=e=>{w.terminate();r.trabajador=null;mal(Error(e.message));};
   w.onmessage=({data:q})=>{
    if(q.error){w.terminate();r.trabajador=null;mal(Error(q.error));return;}
    if(q.progress){avance(q.progress/q.total);return;}
    if(q.volume){w.terminate();r.trabajador=null;ok(q.volume);}
   };
   w.postMessage({n:s.n,views:s.views,data:s.data,window:1,ramp:true});
  });
 }

 // Entra al paso: s son las proyecciones (corregidas o no), ctBytes los cortes del ZIP.
 async function abrir({s,fuente,ctBytes,filaCorazon}){
  const aviso=$('regEstado');
  if(!ctBytes||!ctBytes.length){aviso.textContent='Para el registro hace falta el CT, que viene en el ZIP. Toca «Cambiar archivo» y elige el ZIP «Cardiaco …» una vez más: desde ahí queda guardado con el CT.';aviso.className='estado error';return false;}
  if(r.s===s&&r.vol){pintar();return true;}
  cancelar();r.listo=false;r.s=s;r.fuente=fuente;r.vol=null;r.cache=null;r.detenido=false;r.enCurso=true;
  Progreso.abrir('Reconstrucción FBP para el registro',cancelar);
  try{
   aviso.className='estado';aviso.textContent='Leyendo el CT…';Progreso.avance(null,'Leyendo el CT del ZIP…');await new Promise(q=>setTimeout(q,0));
   if(r.ctBytes!==ctBytes){r.ct=prepararCT(s,ctBytes);r.ctBytes=ctBytes;}
   const t0=performance.now();
   const completa=completarFranja(s);r.franjas=completa.vistas;
   // La barra: 85 % la FBP (corte por corte) y 15 % el suavizado.
   const v=await fbp(completa.s,q=>{aviso.textContent=`Reconstruyendo con FBP… ${Math.round(q*100)} %`;Progreso.avance(q*.85,`Filtro rampa y retroproyección: corte ${Math.round(q*s.n)} de ${s.n}`);});
   aviso.textContent='Suavizando la reconstrucción…';Progreso.avance(.85,`Suavizado gaussiano 3D de ${dec(FWHM,1)} mm…`);
   const sv=await Lab95.gaussian3D(v,s.n,FWHM/s.spacing/2.354820045,()=>r.s!==s||r.detenido);
   if(r.s!==s||!sv){if(r.detenido)throw Error('detenida');return false;}
   Progreso.avance(1,'Listo');
   r.vol=sv;
   const muestra=[];for(let i=0;i<sv.length;i+=7)if(sv[i]>0)muestra.push(sv[i]);muestra.sort((a,b)=>a-b);r.escala=muestra[Math.floor(muestra.length*.995)]||1;
   // Cortes iniciales por el corazon: la fila del maximo de la imagen suma y, en ese corte
   // axial, la posicion del maximo de la reconstruccion.
   const n=s.n,z=Math.max(0,Math.min(n-1,filaCorazon));let mi=0;for(let i=0;i<n*n;i++)if(sv[z*n*n+i]>sv[z*n*n+mi])mi=i;
   r.corte={axial:z,coronal:Math.floor(mi/n),sagital:mi%n};
   r.listo=true;
   aviso.className='estado ok';aviso.textContent=`FBP con filtro rampa de las proyecciones ${fuente}, suavizada con un gaussiano de ${dec(FWHM,1)} mm. Tomó ${dec((performance.now()-t0)/1000,1)} s.`;
   pintar();return true;
  }catch(err){
   if(r.detenido){aviso.className='estado';aviso.textContent='FBP detenida. Para reconstruir de nuevo, vuelve al control de calidad y pulsa «Siguiente».';r.s=null;}
   else{aviso.className='estado error';aviso.textContent='No se pudo preparar el registro: '+(err.message||err);console.error(err);}
   return false;
  }
  finally{r.enCurso=false;Progreso.cerrar();}
 }
 // Detiene la FBP en curso (boton «Detener» o salir del paso).
 function cancelar(){if(r.enCurso)r.detenido=true;if(r.trabajador){r.trabajador.terminate();r.trabajador=null;if(r.rechazo)r.rechazo(Error('detenida'));}r.rechazo=null;}

 // Coordenadas del volumen para un punto (u,v) del plano elegido, como en el escritorio.
 function coords(u,v,i){return r.plano==='axial'?[u,v,i]:r.plano==='coronal'?[u,i,v]:[i,u,v];}
 function pintar(){
  if(!r.listo)return;
  const s=r.s,n=s.n,i=r.corte[r.plano],c=$('regFusion'),k=[r.plano,i,...r.off].join('|');
  if(!r.cache||r.cache.clave!==k){
   const hu=new Float32Array(TAM*TAM),em=new Float32Array(TAM*TAM),vol=r.vol;
   const at=(x,y,z)=>vol[z*n*n+y*n+x];
   for(let v=0;v<TAM;v++)for(let u=0;u<TAM;u++){
    const a=u*(n-1)/(TAM-1),b=v*(n-1)/(TAM-1),[x,y,z]=coords(a,b,i);
    hu[v*TAM+u]=Lab95.sampleCT(r.ct,Lab95.point(s,x,y,z,r.off));
    // Emision: bilineal en el plano, sobre la grilla del SPECT.
    const ia=Math.min(n-2,Math.floor(a)),ib=Math.min(n-2,Math.floor(b)),wa=a-ia,wb=b-ib;
    const p=(q,w)=>{const [X,Y,Z]=coords(q,w,i);return at(X,Y,Z);};
    em[v*TAM+u]=(p(ia,ib)*(1-wa)+p(ia+1,ib)*wa)*(1-wb)+(p(ia,ib+1)*(1-wa)+p(ia+1,ib+1)*wa)*wb;
   }
   r.cache={clave:k,hu,em};
  }
  if(c.width!==TAM){c.width=TAM;c.height=TAM;}
  const ctx=c.getContext('2d'),im=ctx.createImageData(TAM,TAM),[nivel,ancho]=VENTANAS[r.ventana];
  for(let j=0;j<TAM*TAM;j++){
   const e=Math.max(0,Math.min(1,(r.cache.em[j]/r.escala-r.nivel)/r.ancho+.5)),h=r.cache.hu[j],gris=255*Math.max(0,Math.min(1,(h-nivel)/ancho+.5)),col=paleta(e),a=e>0?r.mezcla:0,o=j*4;
   // Fuera de la cobertura del CT el fondo es azul oscuro: ahi no hay con que calzar.
   for(let q=0;q<3;q++)im.data[o+q]=Number.isFinite(h)?gris*(1-a)+col[q]*a:(q===2?50:0)*(1-a)+col[q]*a;
   im.data[o+3]=255;
  }
  ctx.putImageData(im,0,0);
  $('regPlanoTexto').textContent={axial:'Axial',coronal:'Coronal',sagital:'Sagital'}[r.plano];
  $('regCorte').textContent=`${i+1}/${n}`;$('regCorteRango').max=n-1;$('regCorteRango').value=i;
  $('regMezcla').value=Math.round(r.mezcla*100);$('regNivel').value=Math.round(r.nivel*100);$('regAncho').value=Math.round(r.ancho*100);
  $('regVentanaSpect').textContent=`muestra de ${Math.round(Math.max(0,r.nivel-r.ancho/2)*100)} % a ${Math.round((r.nivel+r.ancho/2)*100)} %`;
  document.querySelectorAll('[data-plano]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plano===r.plano)));
  // En coronal y sagital lo vertical es Z: SPECT y CT comparten origen a lo largo de la camilla.
  $('regArriba').disabled=$('regAbajo').disabled=r.plano!=='axial';
 }

 // Mover el CT: arrastrar sobre la imagen o tocar las flechas (1 mm). Se mueve el CT, no el SPECT.
 function mover(du,dv){
  if(!r.listo)return;
  const tope=v=>Math.max(-150,Math.min(150,v));
  if(r.plano==='axial'){r.off[0]=tope(r.off[0]+du);r.off[1]=tope(r.off[1]+dv);}
  else if(r.plano==='coronal')r.off[0]=tope(r.off[0]+du);
  else r.off[1]=tope(r.off[1]+du);
  if(r.confirmado){r.confirmado=null;$('aOsem').hidden=true;if($('a7Reconstruir'))$('a7Reconstruir').hidden=true;$('regResultado').textContent='Moviste el CT después de confirmar: vuelve a confirmar cuando calce.';$('regResultado').className='dato';}
  pintar();
 }
 function arrastre(c){
  let ult=null,resto=[0,0];
  c.addEventListener('pointerdown',e=>{ult=[e.clientX,e.clientY];resto=[0,0];try{c.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();});
  c.addEventListener('pointermove',e=>{
   if(!ult||!r.listo)return;const b=c.getBoundingClientRect(),mm=(r.s.n-1)*r.s.spacing/b.width;
   resto[0]+=(e.clientX-ult[0])*mm;resto[1]+=(e.clientY-ult[1])*mm;ult=[e.clientX,e.clientY];
   const du=Math.trunc(resto[0]),dv=Math.trunc(resto[1]);if(!du&&!dv)return;resto[0]-=du;resto[1]-=dv;mover(du,dv);
  });
  const soltar=()=>{ult=null;};c.addEventListener('pointerup',soltar);c.addEventListener('pointercancel',soltar);
 }
 function confirmar(){
  if(!r.listo)return;
  const [x,y]=r.off.map(v=>Math.abs(Math.round(v))),peor=Math.max(x,y),vox=dec(r.s.spacing,1),out=$('regResultado');
  if(peor<=EXACTO){r.confirmado={x,y};out.className='dato bien';out.textContent=`Registro confirmado. Quedó a ${x} mm en X y ${y} mm en Y de la posición correcta: dentro de un vóxel (${vox} mm). El CT calza con la emisión.`;}
  else if(peor<=ACEPTABLE){r.confirmado={x,y};out.className='dato bien';out.textContent=`Registro confirmado. Quedó a ${x} mm en X y ${y} mm en Y de la posición correcta, unos dos vóxeles. Aceptable; si quieres afinar, ajusta y confirma de nuevo.`;}
  else{r.confirmado=null;out.className='dato mal';out.textContent='Todavía no calza. Mira la piel del tórax y el corazón en los tres planos, sigue moviendo el CT y vuelve a confirmar.';}
  $('aOsem').hidden=!r.confirmado;if($('a7Reconstruir'))$('a7Reconstruir').hidden=!r.confirmado;
 }

 function iniciar(){
  arrastre($('regFusion'));
  const repetir=(b,f)=>{let t=null;const parar=()=>{clearInterval(t);t=null;};b.addEventListener('pointerdown',e=>{e.preventDefault();f();parar();t=setInterval(f,90);});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,parar));};
  repetir($('regIzq'),()=>mover(-1,0));repetir($('regDer'),()=>mover(1,0));repetir($('regArriba'),()=>mover(0,-1));repetir($('regAbajo'),()=>mover(0,1));
  document.querySelectorAll('[data-plano]').forEach(b=>b.addEventListener('click',()=>{r.plano=b.dataset.plano;pintar();}));
  $('regCorteRango').addEventListener('input',e=>{r.corte[r.plano]=+e.target.value;pintar();});
  $('regMezcla').addEventListener('input',e=>{r.mezcla=+e.target.value/100;pintar();});
  $('regNivel').addEventListener('input',e=>{r.nivel=+e.target.value/100;pintar();});
  $('regAncho').addEventListener('input',e=>{r.ancho=Math.max(.01,+e.target.value/100);pintar();});
  $('regSpectInicial').addEventListener('click',()=>{r.nivel=.65;r.ancho=.7;pintar();});
  $('regVentana').addEventListener('change',e=>{r.ventana=e.target.value;pintar();});
  $('regConfirmar').addEventListener('click',confirmar);
 }
 // Otro archivo u otras proyecciones: el registro empieza de nuevo.
 function olvidar(){cancelar();r.s=null;r.vol=null;r.ct=null;r.ctBytes=null;r.cache=null;r.listo=false;r.confirmado=null;r.off=[0,0,0];$('aOsem').hidden=true;$('regResultado').textContent='';$('regResultado').className='dato';}
 return {iniciar,abrir,cancelar,olvidar,estado:r};
})();
window.Registro=Registro;
