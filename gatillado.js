/* Paso del gatillado en la version movil. Lee NM_estres_gatillado.dcm (8 intervalos del ciclo
   cardiaco por vista), reconstruye cada intervalo como en el tutorial de escritorio de
   spect-lab-95 (reconstruirGate): OSEM 2D por cortes con la receta CARDIACO_GATILLADO (2 x 8),
   sin atenuacion, inicio uniforme, solo en el rango de cortes del corazon, y despues un
   gaussiano 3D de 8,4 mm sobre ese rango (suavizarSub). El rango lo elige el estudiante sobre
   una proyeccion de maxima intensidad coronal de la OSEM de la izquierda, arrastrando dos
   lineas. Si el estudiante corrigio el movimiento, cada intervalo se corrige con los mismos
   saltos encontrados en la adquisicion no gatillada (el paciente se movio igual en las dos,
   que se adquieren a la vez). El resultado se anima como cine: transaxial y coronal latiendo. */
'use strict';
const Gatillado=(()=>{
 const C=CardiacoCore,$=id=>document.getElementById(id);
 const dec=(x,d)=>Number(x).toFixed(d).replace('.',',');
 const RECETA=CARDIACO_GATILLADO,MIN=5,MAX=70;
 const BASE={attenuationCorrection:false,scatter:false,scatterWeight:0,resolutionRecovery:false,distanceDependent:false,axialRecovery:false,scatterSmoothing:false,scatterFwhm:0,postFilter:false,postFilterFWHMmm:0,initialization:'uniform',scatterWindowScale:0};
 const g={bytes:null,s:null,cuadros:null,referencia:null,z0:45,z1:75,recon:null,t:0,corte:60,y:50,techo:1,timer:null,tarea:null,rechazo:null,ocupado:false,detenido:false,ms:125};

 // Lee la gatillada una sola vez (unos 67 MB en memoria: 1024 cuadros de 128 x 128).
 async function leer(bytes){
  const d=await Lab95.read(new Blob([bytes]));const s=Lab95.spect(d,{gated:true});
  const cuadros=Array.from({length:s.frames},(_,i)=>({cabezal:d.uint16('x00540020',i),ventana:d.uint16('x00540010',i),paso:d.uint16('x00540090',i)}));
  return {s,cuadros};
 }
 // Un intervalo como adquisicion propia, corregido con los saltos de la no gatillada si los hay.
 function intervalo(slot,correccion){
  const sg=Lab95.gate(g.s,slot);
  if(!correccion||!correccion.saltos?.length)return sg;
  const origen=g.s.views.filter(v=>v.slot===slot).map(v=>v.source),cuadros=origen.map(i=>g.cuadros[i]);
  return Correccion.aplicar(sg,cuadros,correccion).s;
 }
 function osem(sg,z0,z1,avance){
  return new Promise((ok,mal)=>{
   const codigo=[createModel.toString(),sampleGrid.toString(),attenuationWeights.toString(),gaussianKernel95.toString(),scatterBlur95.toString(),createPsfView95.toString(),'('+osem95Worker.toString()+')()'].join('\n');
   const pool=createOsem95Pool(codigo);g.tarea=pool;g.rechazo=mal;
   const mid=Math.floor((z0+z1)/2),rad=Math.max(mid-z0,z1-mid);
   pool.onerror=err=>{pool.terminate();mal(Error(err.message||'Error del cálculo.'));};
   pool.onmessage=({data:q})=>{
    if(q.error){pool.terminate();mal(Error(q.error));return;}
    if(q.progress){avance(q.total?q.completed/q.total:0);return;}
    if(q.volume){pool.terminate();g.tarea=null;g.rechazo=null;const rows=q.rows.filter(z=>z>=z0&&z<=z1).sort((a,b)=>a-b),n=sg.n,p=n*n,sub=new Float32Array(rows.length*p);rows.forEach((z,i)=>sub.set(q.volume.subarray(z*p,(z+1)*p),i*p));ok({rows,data:sub});}
   };
   pool.postMessage({n:sg.n,data:sg.data,views:sg.views,spacing:sg.spacing,window:1,scatterWindow:0,settings:{...BASE,iterations:RECETA.iteraciones,subsets:RECETA.subconjuntos},mu:null,fbp:null,outsideAir:true,previewRow:mid,previewRadius:rad});
  });
 }
 // El gaussiano 3D del escritorio sobre el subvolumen (suavizarSub), con bordes reflejados.
 function suavizarSub(vol,n,K,sigma){
  const radius=Math.max(1,Math.ceil(3*sigma)),kernel=[];let sum=0;for(let k=-radius;k<=radius;k++){const w=Math.exp(-.5*(k/sigma)**2);kernel.push(w);sum+=w;}for(let i=0;i<kernel.length;i++)kernel[i]/=sum;
  const dims=[n,n,K],strides=[1,n,n*n];let input=vol;
  for(let axis=0;axis<3;axis++){const out=new Float32Array(vol.length),L=dims[axis],st=strides[axis];
   for(let i=0;i<vol.length;i++){const pos=Math.floor(i/st)%L;let acc=0;for(let k=-radius;k<=radius;k++){let q=pos+k;if(q<0)q=-q-1;if(q>=L)q=2*L-q-1;acc+=input[i+(q-pos)*st]*kernel[k+radius];}out[i]=acc;}input=out;}
  return input;
 }

 async function abrir({bytes,referencia,filaCorazon,correccion}){
  const aviso=$('gatEstado');
  if(!bytes){aviso.className='estado error';aviso.textContent='Para el gatillado hace falta NM_estres_gatillado.dcm, que viene en el ZIP. Toca «Cambiar archivo» y elige el ZIP «Cardiaco …» una vez más: desde ahí queda guardado.';return false;}
  g.referencia=referencia;g.correccion=correccion||null;
  if(g.bytes!==bytes){
   aviso.className='estado';aviso.textContent='Leyendo la adquisición gatillada…';
   Progreso.abrir('Leyendo la adquisición gatillada',null);Progreso.avance(null,'1024 cuadros: 8 intervalos × 64 vistas × 2 ventanas');
   try{await new Promise(q=>setTimeout(q,30));const r=await leer(bytes);g.s=r.s;g.cuadros=r.cuadros;g.bytes=bytes;g.recon=null;}
   catch(err){aviso.className='estado error';aviso.textContent='No se pudo leer la gatillada: '+(err.message||err);console.error(err);return false;}
   finally{Progreso.cerrar();}
   const f=Number.isFinite(filaCorazon)?filaCorazon:g.s.n>>1;g.z0=Math.max(0,f-15);g.z1=Math.min(g.s.n-1,f+15);
   aviso.className='estado ok';aviso.textContent=`Gatillada: ${g.s.slots} intervalos del ciclo cardíaco, ${g.s.views.filter(v=>v.slot===1&&v.window===1).length} vistas cada uno. Elige el rango de cortes del corazón y reconstruye.`;
  }
  pintarRango();pintarCine();return true;
 }

 // Proyeccion de maxima intensidad coronal de la OSEM de la izquierda: el corazon se ve aunque
 // no se sepa en que corte de adelante hacia atras esta. Filas = cortes (cabeza arriba).
 function pintarRango(){
  const c=$('gatRango'),ref=g.referencia;if(!ref||!g.s){c.getContext('2d').clearRect(0,0,c.width,c.height);return;}
  const n=g.s.n,p=n*n,img=new Float32Array(p);
  for(let z=0;z<n;z++)for(let x=0;x<n;x++){let m=0;for(let y=0;y<n;y++){const v=ref.data[z*p+y*n+x];if(v>m)m=v;}img[z*n+x]=m;}
  if(c.width!==n*3){c.width=n*3;c.height=n*3;}
  C.pintar(c,img,n,{paleta:'cardiaca',max:C.percentil(img,.999)});
  const x=c.getContext('2d'),e=c.width/n;
  x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,0,c.width,g.z0*e);x.fillRect(0,(g.z1+1)*e,c.width,c.height);
  x.fillStyle='#9be7a0';for(const z of [g.z0,g.z1+1]){x.fillRect(0,z*e-1.5,c.width,3);x.beginPath();x.arc(c.width-14,z*e,9,0,2*Math.PI);x.fill();}
  const K=g.z1-g.z0+1;$('gatRangoTexto').textContent=`Cortes ${g.z0+1} a ${g.z1+1}: ${K} cortes, ${dec(K*g.s.spacing/10,1)} cm.${K<MIN||K>MAX?` Elige de ${MIN} a ${MAX} cortes.`:''}`;
  $('gatCorrer').disabled=g.ocupado||K<MIN||K>MAX;
 }
 function tactilRango(){
  const c=$('gatRango');let cual=null;
  const fila=e=>{const b=c.getBoundingClientRect();return Math.round((e.clientY-b.top)/b.height*g.s.n);};
  c.addEventListener('pointerdown',e=>{if(!g.s)return;e.preventDefault();try{c.setPointerCapture(e.pointerId);}catch(err){}const z=fila(e);cual=Math.abs(z-g.z0)<=Math.abs(z-(g.z1+1))?'z0':'z1';mover(z);});
  c.addEventListener('pointermove',e=>{if(cual)mover(fila(e));});
  const mover=z=>{const n=g.s.n;if(cual==='z0')g.z0=Math.max(0,Math.min(g.z1-MIN+1,z));else g.z1=Math.min(n-1,Math.max(g.z0+MIN-1,z-1));pintarRango();};
  const soltar=()=>{cual=null;};c.addEventListener('pointerup',soltar);c.addEventListener('pointercancel',soltar);
 }

 async function reconstruir(){
  if(g.ocupado||!g.s)return;const z0=g.z0,z1=g.z1,K=z1-z0+1;if(K<MIN||K>MAX)return;
  detener();g.ocupado=true;g.detenido=false;$('gatCorrer').disabled=true;const t0=performance.now(),T=g.s.slots,volumes=[];let rows=null;
  Progreso.abrir(`Gatillado: OSEM ${RECETA.iteraciones} × ${RECETA.subconjuntos} en ${T} intervalos`,cancelar,`Cada intervalo tiene la octava parte de las cuentas: se reconstruyen por separado, solo en los ${K} cortes elegidos, y después se suavizan con un gaussiano de ${dec(RECETA.filtroMm,1)} mm.`);
  try{
   for(let t=1;t<=T;t++){
    if(g.detenido)throw Error('detenida');
    Progreso.avance((t-1)/T,`Intervalo ${t} de ${T}: OSEM…`);
    const sg=intervalo(t,g.correccion);
    const r=await osem(sg,z0,z1,f=>Progreso.avance((t-1+f*.9)/T,`Intervalo ${t} de ${T}: OSEM ${Math.round(f*100)} %`));
    rows=r.rows;Progreso.avance((t-.1)/T,`Intervalo ${t} de ${T}: suavizado…`);await new Promise(q=>setTimeout(q,0));
    volumes.push(suavizarSub(r.data,sg.n,rows.length,RECETA.filtroMm/sg.spacing/2.354820045));
   }
   const segundos=(performance.now()-t0)/1000;
   g.recon={n:g.s.n,rows,volumes,segundos};g.t=0;ubicar();
   $('gatEstado').className='estado ok';$('gatEstado').textContent=`Gatillado reconstruido: ${rows.length} cortes × ${T} intervalos en ${dec(segundos,0)} s${g.correccion?.saltos?.length?', con la corrección de movimiento de la no gatillada':''}.`;
   pintarCine();latir();
  }catch(err){
   $('gatEstado').className=g.detenido?'estado':'estado error';$('gatEstado').textContent=g.detenido?'Reconstrucción gatillada detenida.':'No se pudo reconstruir el gatillado: '+(err.message||err);if(!g.detenido)console.error(err);
  }finally{g.ocupado=false;g.tarea=null;g.rechazo=null;Progreso.cerrar();pintarRango();}
 }
 function cancelar(){if(g.ocupado)g.detenido=true;if(g.tarea){g.tarea.terminate();g.tarea=null;}if(g.rechazo){g.rechazo(Error('detenida'));g.rechazo=null;}}

 // Donde mirar al terminar: el maximo de la actividad promediada entre intervalos, solo en la
 // region donde cardiaco-core busca el ventriculo (adelante y a la izquierda del paciente, lejos
 // de los bordes). En el estres del caso 1 el borde lateral derecho brilla por la franja sin
 // medicion y, sin esta region, el cine partia mostrando ese borde. Tambien centra el recorte.
 function ubicar(){
  const {n,rows,volumes}=g.recon,p=n*n,c=n>>1,K=rows.length;let mejor=-1,bx=c+10,by=c-6,bk=K>>1;
  for(let k=1;k<K-1;k++)for(let y=Math.max(1,c-26);y<=Math.min(n-2,c+14);y++)for(let x=Math.max(1,c-10);x<=Math.min(n-2,c+30);x++){
   let s=0;for(const v of volumes)for(let dk=-1;dk<=1;dk++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)s+=v[(k+dk)*p+(y+dy)*n+x+dx];
   if(s>mejor){mejor=s;bx=x;by=y;bk=k;}}
  g.corte=rows[bk];g.y=by;g.cx=bx;g.cy=by;
 }
 const VENTANA=64; // lado del recorte en voxeles (unos 21 cm): el corazon se ve el doble de grande
 function recorte(){const n=g.recon.n,h=VENTANA/2,x0=Math.max(0,Math.min(n-VENTANA,Math.round(g.cx-h))),y0=Math.max(0,Math.min(n-VENTANA,Math.round(g.cy-h)));return {x0,y0};}
 // Cine: transaxial del corte elegido y coronal por el ventriculo, el mismo intervalo en los dos.
 // La escala es el maximo de todos los intervalos (x techo), como el escritorio: asi se ve el
 // engrosamiento de la pared, que brilla mas en sistole.
 function pintarCine(){
  const hay=!!g.recon;$('gatCine').hidden=!hay;if(!hay)return;
  const {n,rows,volumes}=g.recon,p=n*n,i=Math.max(0,rows.indexOf(g.corte)),t=g.t%volumes.length,K=rows.length;
  // Recorte de VENTANA x VENTANA centrado en el corazon; la escala es la del recorte.
  const W=VENTANA,{x0,y0}=recorte(),ai=new Float32Array(W*W);
  let max=0;for(const v of volumes)for(let y=0;y<W;y++)for(let x=0;x<W;x++){const q=v[i*p+(y0+y)*n+x0+x];if(q>max)max=q;}
  for(let y=0;y<W;y++)for(let x=0;x<W;x++)ai[y*W+x]=volumes[t][i*p+(y0+y)*n+x0+x];
  const ax=$('gatAxial');if(ax.width!==W*5){ax.width=W*5;ax.height=W*5;}
  C.pintar(ax,ai,W,{paleta:'cardiaca',max:max*.9,techo:g.techo});
  {const x=ax.getContext('2d'),e=ax.width/W;x.fillStyle='rgba(77,208,225,.6)';x.fillRect(0,(g.y-y0+.5)*e-1,ax.width,2);}
  const co=$('gatCoronal');if(co.width!==W*5||co.height!==K*5){co.width=W*5;co.height=K*5;}
  const img=new Float32Array(K*W);let mc=0;for(const v of volumes)for(let k=0;k<K;k++)for(let x=0;x<W;x++){const q=v[k*p+g.y*n+x0+x];if(q>mc)mc=q;}
  for(let k=0;k<K;k++)for(let x=0;x<W;x++)img[k*W+x]=volumes[t][k*p+g.y*n+x0+x];
  pintarRect(co,img,W,K,mc*.9);
  {const x=co.getContext('2d'),e=co.width/W;x.fillStyle='rgba(255,238,88,.6)';x.fillRect(0,(i+.5)*e-1,co.width,2);}
  $('gatIntervalo').textContent=`Intervalo ${t+1} de ${volumes.length}`;
  $('gatCorteRango').min=rows[0];$('gatCorteRango').max=rows[K-1];$('gatCorteRango').value=g.corte;$('gatCorteTexto').textContent=`Corte ${g.corte+1}`;
  $('gatTecho').value=Math.round(g.techo*100);$('gatVel').value=Math.round(1000/g.ms);$('gatVelTexto').textContent=`${Math.round(1000/g.ms)} cuadros/s`;
  const bar=$('gatBarra');bar.replaceChildren(...volumes.map((_,q)=>{const s=document.createElement('span');if(q===t)s.className='activo';return s;}));
 }
 // cardiaco-core.pintar es para imagenes cuadradas; el coronal del rango es de n x K.
 function pintarRect(c,img,w,h,max){
  const base=document.createElement('canvas');base.width=w;base.height=h;const x=base.getContext('2d'),id=x.createImageData(w,h),pal=C.PALETAS.cardiaca,tope=max*g.techo||1;
  for(let i=0;i<w*h;i++){const col=pal(Math.max(0,Math.min(1,img[i]/tope)));id.data[i*4]=col[0];id.data[i*4+1]=col[1];id.data[i*4+2]=col[2];id.data[i*4+3]=255;}
  x.putImageData(id,0,0);const o=c.getContext('2d');o.imageSmoothingEnabled=false;o.drawImage(base,0,0,c.width,c.height);
 }
 function latir(){detener();$('gatPlay').textContent='■ Parar';g.timer=setInterval(()=>{g.t++;pintarCine();},g.ms);}
 function detener(){if(g.timer){clearInterval(g.timer);g.timer=null;}$('gatPlay').textContent='▶ Latir';}
 function iniciar(){
  tactilRango();
  $('gatCorrer').addEventListener('click',reconstruir);
  $('gatPlay').addEventListener('click',()=>{if(!g.recon)return;g.timer?detener():latir();});
  $('gatCorteRango').addEventListener('input',e=>{g.corte=+e.target.value;pintarCine();});
  $('gatTecho').addEventListener('input',e=>{g.techo=Math.max(.05,+e.target.value/100);pintarCine();});
  $('gatVel').addEventListener('input',e=>{g.ms=Math.round(1000/Math.max(1,+e.target.value));if(g.timer)latir();else pintarCine();});
  $('gatAnt').addEventListener('click',()=>{if(!g.recon)return;detener();g.t=(g.t+g.recon.volumes.length-1)%g.recon.volumes.length;pintarCine();});
  $('gatSig').addEventListener('click',()=>{if(!g.recon)return;detener();g.t=(g.t+1)%g.recon.volumes.length;pintarCine();});
  // Tocar el transaxial elige por donde pasa el coronal; tocar el coronal elige el corte.
  const toque=(id,f)=>{const c=$(id);let on=false;const h=e=>{if(!g.recon)return;const b=c.getBoundingClientRect();f((e.clientX-b.left)/b.width,(e.clientY-b.top)/b.height);pintarCine();};c.addEventListener('pointerdown',e=>{on=true;try{c.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();h(e);});c.addEventListener('pointermove',e=>{if(on)h(e);});['pointerup','pointercancel'].forEach(ev=>c.addEventListener(ev,()=>{on=false;}));};
  toque('gatAxial',(u,v)=>{const {y0}=recorte();g.y=Math.max(0,Math.min(g.recon.n-1,y0+Math.floor(v*VENTANA)));});
  toque('gatCoronal',(u,v)=>{const r=g.recon.rows;g.corte=r[Math.max(0,Math.min(r.length-1,Math.floor(v*r.length)))];});
 }
 function salir(){detener();cancelar();}
 function olvidar(){salir();g.bytes=null;g.s=null;g.cuadros=null;g.recon=null;}
 return {iniciar,abrir,salir,olvidar,estado:g};
})();
window.Gatillado=Gatillado;
