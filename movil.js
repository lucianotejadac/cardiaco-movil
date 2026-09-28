/* Version movil del tutorial cardiaco, paso 1. Carga el ZIP de U-Cursos, saca las proyecciones
   de estres sin corregir del caso 1 y muestra cine, sinograma, linograma e imagen suma. Dos
   vistas: «una columna» (las cuatro imagenes en una pantalla) y «vista corregido» (dos columnas:
   sin corregir a la izquierda y, a la derecha, la correccion automatica de movimiento que hace
   la propia aplicacion, en correccion.js; proyecciones y sinograma arriba, suma y linograma
   bajando). Todas las imagenes
   comparten dos cursores: la fila (linea amarilla) y la vista (linea celeste). Reutiliza el motor
   de spect-lab-95 (Lab95.read / Lab95.spect) y la logica del control de calidad de escritorio. */
'use strict';
const CASO=1,FASE='estres';
const AMARILLA='rgba(255,238,88,.95)',CELESTE='rgba(77,208,225,.95)';
const $=id=>document.getElementById(id);
const dec=(x,d)=>Number(x).toFixed(d).replace('.',',');
const paleta=v=>{v=Math.max(0,Math.min(1,v));return [255*Math.min(1,v*3),255*Math.max(0,Math.min(1,v*3-1)),255*Math.max(0,v*3-2)];};
const TIPOS={cine:'Cine',sino:'Sinograma',suma:'Imagen suma',lino:'Linograma'};
const DIALOGO={cine:'dCine',sino:'dSino',suma:'dSuma',lino:'dLino'};
const EJES={cine:'y',suma:'y',sino:'k',lino:'ky'};
const estado={crudo:null,corr:null,ct:null,cuadros:null,correccion:null,ocupado:false,k:0,y:64,modo:'uno',timer:null,aviso:'',resumen:'',comparacion:''};

function imagen(img,w,h,max){
 const id=new ImageData(w,h);for(let i=0;i<w*h;i++){const c=paleta(Math.max(0,img[i])/(max||1));id.data[i*4]=c[0];id.data[i*4+1]=c[1];id.data[i*4+2]=c[2];id.data[i*4+3]=255;}
 return id;
}
function poner(canvas,id){if(canvas.width!==id.width||canvas.height!==id.height){canvas.width=id.width;canvas.height=id.height;}const ctx=canvas.getContext('2d');ctx.putImageData(id,0,0);return ctx;}
const lineaH=(ctx,y,w)=>{ctx.fillStyle=AMARILLA;ctx.fillRect(0,y,w,1);};
const lineaV=(ctx,x,h)=>{ctx.fillStyle=CELESTE;ctx.fillRect(x,0,1,h);};
function mensaje(texto,clase){const e=$('estado');e.textContent=texto;e.className='estado'+(clase?' '+clase:'');}

/* ---------- ZIP: solo lo necesario para sacar archivos del ZIP de la entrega ---------- */
async function entradasZip(buf){
 const dv=new DataView(buf),u8=new Uint8Array(buf);
 let eocd=-1;for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-65557);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
 if(eocd<0)throw Error('El archivo no parece un ZIP.');
 const n=dv.getUint16(eocd+10,true);let p=dv.getUint32(eocd+16,true);const lista=[];
 for(let k=0;k<n;k++){
  if(dv.getUint32(p,true)!==0x02014b50)break;
  const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),usize=dv.getUint32(p+24,true),nlen=dv.getUint16(p+28,true),elen=dv.getUint16(p+30,true),clen=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true);
  lista.push({name:new TextDecoder().decode(u8.subarray(p+46,p+46+nlen)),method,csize,usize,off});p+=46+nlen+elen+clen;
 }
 return lista;
}
async function extraer(buf,entrada){
 const dv=new DataView(buf),u8=new Uint8Array(buf),lh=entrada.off;
 if(dv.getUint32(lh,true)!==0x04034b50)throw Error('Entrada del ZIP dañada.');
 const nlen=dv.getUint16(lh+26,true),elen=dv.getUint16(lh+28,true),inicio=lh+30+nlen+elen,comp=u8.subarray(inicio,inicio+entrada.csize);
 if(entrada.method===0)return comp.slice();
 if(entrada.method===8){
  if(typeof DecompressionStream==='undefined')throw Error('Este navegador no puede descomprimir el ZIP. Usa Chrome actualizado.');
  const ds=new DecompressionStream('deflate-raw');const salida=await new Response(new Blob([comp]).stream().pipeThrough(ds)).arrayBuffer();return new Uint8Array(salida);
 }
 throw Error('Método de compresión no admitido ('+entrada.method+').');
}
// La cruda de estres: NM_estres.dcm, de preferencia en una carpeta «Caso 1». La copia corregida
// por el equipo, si el ZIP la trae, no se usa: la correccion la hace la aplicacion.
function elegirEntradas(lista){
 const crudas=lista.filter(e=>/(^|\/)NM_estres\.dcm$/i.test(e.name));
 if(!crudas.length)return null;
 const cruda=crudas.find(e=>/caso\s*1(\/|$)/i.test(e.name.replace(/\\/g,'/')))||crudas[0];
 // El CT de la misma fase: los cortes de la subcarpeta «CT …» junto a la cruda. Se usa en el registro.
 const carpeta=cruda.name.slice(0,cruda.name.lastIndexOf('/')+1).toLowerCase();
 const ct=lista.filter(e=>{const q=e.name.toLowerCase();return q.startsWith(carpeta)&&/^ct[^/]*\/[^/]+\.dcm$/.test(q.slice(carpeta.length));}).sort((a,b)=>a.name.localeCompare(b.name));
 return {cruda,ct};
}

/* ---------- memoria del telefono ---------- */
// Se guarda solo el DICOM sacado del ZIP (unos 4 MB) en IndexedDB, dentro del navegador: al
// volver a abrir la pagina, o cuando se publica una version nueva, se recarga sin elegir el ZIP.
// Si el navegador no deja guardar (modo incognito, sin espacio), todo sigue funcionando igual.
const MEMORIA={db:'cardiaco-movil',tienda:'archivos',clave:'estres-caso1'};
function abrirMemoria(){return new Promise((ok,mal)=>{const r=indexedDB.open(MEMORIA.db,1);r.onupgradeneeded=()=>r.result.createObjectStore(MEMORIA.tienda);r.onsuccess=()=>ok(r.result);r.onerror=()=>mal(r.error);});}
async function memoria(modo,valor){
 const db=await abrirMemoria();
 try{return await new Promise((ok,mal)=>{const t=db.transaction(MEMORIA.tienda,modo==='leer'?'readonly':'readwrite'),s=t.objectStore(MEMORIA.tienda);
  const r=modo==='leer'?s.get(MEMORIA.clave):modo==='borrar'?s.delete(MEMORIA.clave):s.put(valor,MEMORIA.clave);
  t.oncomplete=()=>ok(r.result);t.onerror=()=>mal(t.error);});}
 finally{db.close();}
}
async function guardar(bytes,origen,ct){
 try{await memoria('guardar',{bytes,origen,ct,fecha:Date.now()});if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});}
 catch(err){console.warn('No se pudo guardar en el teléfono',err);}
}
async function recuperar(){
 let m=null;try{m=await memoria('leer');}catch(err){console.warn('No se pudo leer lo guardado',err);}
 if(m&&m.bytes)await mostrar(m.bytes,m.origen,true,m.ct||null);
}

/* ---------- carga ---------- */
async function cargar(file){
 try{
  mensaje('Leyendo '+file.name+'…');
  let bytes,origen=file.name,ct=null;
  if(/\.zip$/i.test(file.name)||/zip/.test(file.type)){
   const buf=await file.arrayBuffer();const lista=await entradasZip(buf);const e=elegirEntradas(lista);
   if(!e)throw Error('Dentro del ZIP no hay NM_estres.dcm. Revisa que sea el ZIP «Cardiaco …» de U-Cursos.');
   mensaje('Descomprimiendo las proyecciones…');origen=e.cruda.name;
   bytes=await extraer(buf,e.cruda);
   if(e.ct.length){mensaje('Descomprimiendo el CT…');ct=[];for(const q of e.ct)ct.push(await extraer(buf,q));}
  }else bytes=new Uint8Array(await file.arrayBuffer());
  if(await mostrar(bytes,origen,false,ct))await guardar(bytes,origen,ct);
 }catch(err){mensaje(err.message||String(err),'error');console.error(err);}
}
// Muestra un DICOM ya extraido. Devuelve true si se pudo leer.
async function mostrar(bytes,origen,recuperado,ct){
 try{
  const d=await Lab95.read(new Blob([bytes]));
  const crudo=Lab95.spect(d);
  // De que cabezal y de que paso del giro es cada cuadro: lo necesita la correccion.
  estado.cuadros=Array.from({length:crudo.frames},(_,i)=>({cabezal:d.uint16('x00540020',i),ventana:d.uint16('x00540010',i),paso:d.uint16('x00540090',i)}));
  const marco=CARDIACO_CASOS[CASO].fases[FASE].marco,esDelCaso=cardiacoHash(crudo.frame)===marco;
  estado.aviso=esDelCaso?'':'Atención: este archivo no es el estrés del caso 1. Se muestra igual. ';
  mensaje((esDelCaso?'Proyecciones del caso 1, estrés: ':'Atención: este archivo no es el estrés del caso 1 (se muestra igual). ')+origen+(recuperado?' (guardado en este teléfono)':''),esDelCaso?'ok':'error');
  const c=CARDIACO_CASOS[CASO].clinica;$('antecedenteTexto').textContent=c.antecedentes;$('procedimientoTexto').textContent=c.procedimiento;$('antecedente').hidden=false;
  detener();estado.k=0;
  estado.crudo=preparar(crudo,null);estado.corr=null;estado.correccion=null;estado.modo='uno';
  estado.ct=ct&&ct.length?ct:null;Registro.olvidar();OsemMovil.olvidar();Reorientar.olvidar();Caja.olvidar();$('reg').classList.add('oculta');$('osem').classList.add('oculta');$('caja').classList.add('oculta');$('reo').classList.add('oculta');
  estado.y=estado.crudo.filaInicial;
  textos();
  $('modo').disabled=false;
  $('qc').classList.remove('oculta');$('carga').classList.add('oculta');$('cambiar').hidden=false;
  armar();window.scrollTo(0,0);
  return true;
 }catch(err){
  // Lo guardado no se pudo leer (por ejemplo, de una version anterior): se olvida y se pide el ZIP.
  if(recuperado){memoria('borrar').catch(()=>{});mensaje('Nada cargado todavía.');}
  else mensaje(err.message||String(err),'error');
  console.error(err);return false;
 }
}

/* ---------- una fuente (cruda o corregida): vistas, escalas e imagenes fijas ---------- */
// La corregida usa las escalas de color de la cruda: asi una diferencia de brillo entre las dos
// columnas es una diferencia de cuentas y no de ventana.
function preparar(s,ref){
 const fr=s.views.filter(v=>v.window===1&&v.slot===1).sort((a,b)=>a.angle-b.angle),n=s.n,p=n*n;
 let max=0;for(const v of fr){const a=s.data.subarray(v.source*p,(v.source+1)*p);for(let i=0;i<p;i++)if(a[i]>max)max=a[i];}
 const suma=new Float32Array(p),lino=new Float32Array(fr.length*n);let total=0;
 fr.forEach((v,k)=>{const a=s.data.subarray(v.source*p,(v.source+1)*p);for(let i=0;i<p;i++){suma[i]+=a[i];total+=a[i];}for(let y=0;y<n;y++){let q=0;for(let x=0;x<n;x++)q+=a[y*n+x];lino[y*fr.length+k]=q;}});
 let mi=0,smax=0;for(let i=0;i<p;i++){if(suma[i]>suma[mi])mi=i;if(suma[i]>smax)smax=suma[i];}
 let lmax=0;for(let i=0;i<lino.length;i++)if(lino[i]>lmax)lmax=lino[i];
 const f={s,frames:fr,n,total,lino,linoCuentas:lino,filaInicial:Math.floor(mi/n),max:ref?ref.max:(max*.8||1),sumaMax:ref?ref.sumaMax:smax*.9,linoMax:ref?ref.linoMax:lmax,sinoFila:-1,sino:null};
 f.sumaImg=imagen(suma,n,n,f.sumaMax);f.linoImg=imagen(lino,fr.length,n,f.linoMax);
 return f;
}
function fila(f,y){const s=f.s,fr=f.frames,n=f.n,p=n*n,img=new Float32Array(fr.length*n);let max=0;fr.forEach((v,q)=>{for(let x=0;x<n;x++){const c=s.data[v.source*p+y*n+x];img[x*fr.length+q]=c;if(c>max)max=c;}});return {img,max};}
// Corrimiento entero que mejor hace calzar dos perfiles (busca entre -6 y 6 pixeles).
function corrimiento(a,b,n){let mejor=Infinity,md=0;for(let d=-6;d<=6;d++){let ssd=0;for(let i=8;i<n-8;i++){const q=a[i]-b[i+d];ssd+=q*q;}if(ssd<mejor){mejor=ssd;md=d;}}return md;}

/* ---------- textos calculados sobre el archivo ---------- */
function textos(){
 const f=estado.crudo,s=f.s,fr=f.frames,n=f.n,p=n*n,porVista=Math.round(f.total/fr.length);
 $('cuentas').textContent=`Este archivo trae ${fr.length} vistas repartidas en ${s.arc} grados de giro. Cada vista es una imagen de ${n} × ${n} píxeles, y cada píxel mide ${dec(s.spacing,1)} mm. En total se detectaron ${dec(f.total/1e6,2)} millones de fotones con la energía del tecnecio (a cada fotón detectado se le llama «cuenta»), unas ${dec(porVista/1000,0)} mil por vista. Mientras más cuentas tiene una imagen, menos granulada se ve.`;
 // Movimiento a lo largo de la camilla: corrimiento del perfil de cada vista respecto de la vecina.
 const perfil=(g,k)=>{const q=new Float64Array(n);for(let y=0;y<n;y++)q[y]=g.lino[y*fr.length+k];return q;};
 let salto=0,deriva=0,prev=perfil(f,0);
 for(let k=1;k<fr.length;k++){const cur=perfil(f,k),d=corrimiento(cur,prev,n);salto=Math.max(salto,Math.abs(d));deriva+=d;prev=cur;}
 $('medida').textContent=`Medida automática del movimiento a lo largo de la camilla. El programa compara cada vista con la siguiente y busca cuántos píxeles habría que subirla o bajarla para que calcen. El mayor salto que encontró fue de ${salto} ${salto===1?'píxel':'píxeles'} (${dec(salto*s.spacing,1)} mm), y la suma de todos los saltos de la órbita da ${dec(Math.abs(deriva)*s.spacing,1)} mm. Es una ayuda, no un veredicto: cuando hay pocas cuentas el ruido puede parecer un salto. Compárala con lo que ves en el linograma y en el cine.`;
 // Franja sin medicion: columnas completas con cero cuentas exactas en el borde de cada vista.
 let anchoMax=0,afectadas=0;
 fr.forEach(v=>{const a=s.data.subarray(v.source*p,(v.source+1)*p);const vacia=x=>{for(let y=0;y<n;y++)if(a[y*n+x]>0)return false;return true;};let izq=0;while(izq<n&&vacia(izq))izq++;let der=0;while(der<n-izq&&vacia(n-1-der))der++;const w=izq+der;if(w>0)afectadas++;if(w>anchoMax)anchoMax=w;});
 $('franja').textContent=afectadas?`En este archivo, ${afectadas} de las ${fr.length} vistas tienen una franja sin medición en un borde. La más ancha ocupa ${anchoMax} píxeles, es decir ${dec(anchoMax*s.spacing,0)} mm de los ${dec(n*s.spacing,0)} mm que mide la imagen de lado a lado.`:'En este archivo ninguna vista tiene franjas sin medición.';
 estado.resumen=`${estado.aviso}${fr.length} vistas en ${s.arc}° · ${dec(f.total/1e6,2)} millones de cuentas · franja sin medición de hasta ${dec(anchoMax*s.spacing,0)} mm · salto máximo medido a lo largo de la camilla: ${salto} ${salto===1?'píxel':'píxeles'}.`;
 estado.comparacion='Todavía no se ha corregido. Pulsa «Corregir».';
 $('comparacion').textContent=estado.comparacion;
}

/* ---------- correccion automatica de movimiento ---------- */
const plural=(n,uno,varios)=>`${n} ${n===1?uno:varios}`;
async function corregir(){
 const f=estado.crudo,s=f.s,b=$('modo');estado.ocupado=true;detener();const t0=performance.now();
 b.textContent='Buscando movimiento… 0 %';
 const est=await Correccion.estimar(s,estado.cuadros,q=>{b.textContent=`Buscando movimiento… ${Math.round(q*100)} %`;});
 const r=Correccion.aplicar(s,estado.cuadros,est);
 estado.corr=preparar(r.s,f);
 const frases=est.saltos.map(j=>j.tipo==='camilla'
  ?`a lo largo de la camilla, ${plural(Math.abs(j.pixeles),'píxel','píxeles')} (${dec(Math.abs(j.pixeles)*s.spacing,1)} mm) hacia ${j.pixeles>0?'los pies':'la cabeza'}, desde el paso ${j.paso} de ${est.pasos}`
  :`hacia el lado, ${plural(j.pixeles,'píxel','píxeles')} (${dec(j.pixeles*s.spacing,1)} mm), desde el paso ${j.paso} de ${est.pasos}`);
 const resumen=est.saltos.length?`La aplicación encontró ${plural(est.saltos.length,'salto','saltos')} y ${est.saltos.length===1?'lo':'los'} corrigió: ${frases.join('; ')}.`:'La aplicación no encontró saltos: la columna corregida es igual a la original.';
 estado.correccion={...est,movidos:r.movidos,resumen,segundos:(performance.now()-t0)/1000};
 estado.comparacion=resumen+(est.saltos.length?` Se desplazaron ${r.movidos} de los ${s.frames} cuadros del archivo para devolverlos a su lugar. Cada salto se mantiene hasta el final del giro, así que se corrigen todas las vistas desde ese paso, en los dos cabezales.`:'')+` El cálculo tomó ${dec(estado.correccion.segundos,1)} segundos.`;
 $('comparacion').textContent=estado.comparacion;estado.ocupado=false;
}

/* ---------- la rejilla se arma segun la vista ---------- */
function figura(tipo,sufijo,titulo){
 const f=document.createElement('figure'),c=document.createElement('figcaption'),cv=document.createElement('canvas');
 c.textContent=titulo+' ';
 if(!sufijo&&tipo==='cine'){const m=document.createElement('span');m.id='vistaTexto';m.className='mono';c.append(m);}
 if(!sufijo&&tipo==='sino'){const m=document.createElement('span');m.className='mono';m.append('fila ');const v=document.createElement('span');v.id='filaValor';m.append(v);c.append(m);}
 cv.id=tipo+sufijo;f.append(c,cv);tactil(cv,EJES[tipo]);return f;
}
function verMas(dialogo,texto,clase){const b=document.createElement('button');b.type='button';b.className='vermas'+(clase?' '+clase:'');b.dataset.dialogo=dialogo;b.textContent=texto;b.addEventListener('click',()=>abrir(dialogo));return b;}
function armar(){
 const r=$('rejilla'),dos=estado.modo==='dos'&&!!estado.corr;r.replaceChildren();
 document.body.classList.toggle('comparar',dos);
 const b=$('modo');b.setAttribute('aria-pressed',String(dos));b.textContent=dos?'Volver a sin corregir':estado.corr?'Ver corregido':'Corregir';
 if(!dos){
  const t=document.createElement('div');t.className='columna ancha';t.textContent='Sin corregir';r.append(t);
  for(const tipo of ['cine','suma','sino','lino']){const f=figura(tipo,'',TIPOS[tipo]);f.append(verMas(DIALOGO[tipo],'Ver más'));r.append(f);}
  $('resumen').textContent=estado.resumen;
 }else{
  const t1=document.createElement('div'),t2=document.createElement('div');t1.className=t2.className='columna';t1.textContent='Sin corregir';t2.textContent='Corregido';r.append(t1,t2);
  // Primera fila las proyecciones, segunda el sinograma; bajando, suma y linograma.
  for(const tipo of ['cine','sino','suma','lino']){r.append(figura(tipo,'',TIPOS[tipo]),figura(tipo,'C',TIPOS[tipo]),verMas(DIALOGO[tipo],'Ver más sobre '+TIPOS[tipo].toLowerCase().replace('imagen suma','la imagen suma').replace(/^(cine|sinograma|linograma)$/,'el $1'),'doble'));}
  r.append(verMas('dCorregido','Ver más sobre la corrección','doble'));
  $('resumen').textContent=estado.aviso+estado.correccion.resumen+' Toca «Ver más sobre la corrección».';
 }
 const f=estado.crudo;$('frame').max=f.frames.length-1;$('fila').max=f.n-1;
 redibujar();
}

/* ---------- todas las imagenes comparten dos cursores: fila (y) y vista (k) ---------- */
function dibujar(f,sufijo,ref){
 const s=f.s,fr=f.frames,n=f.n,p=n*n,k=Math.min(estado.k,fr.length-1),y=estado.y;
 const cine=$('cine'+sufijo);if(!cine)return;
 lineaH(poner(cine,imagen(s.data.subarray(fr[k].source*p,(fr[k].source+1)*p),n,n,f.max)),y,n);
 lineaH(poner($('suma'+sufijo),f.sumaImg),y,n);
 if(f.sinoFila!==y||f.sinoRef!==ref){const q=fila(f,y);f.sinoMaxFila=q.max;const max=(ref?ref.sinoMaxFila:q.max)*.9;f.sino=imagen(q.img,fr.length,n,max);f.sinoFila=y;f.sinoRef=ref;}
 lineaV(poner($('sino'+sufijo),f.sino),k,n);
 const ctx=poner($('lino'+sufijo),f.linoImg);lineaH(ctx,y,fr.length);lineaV(ctx,k,n);
}
function redibujar(){
 const f=estado.crudo;if(!f)return;
 estado.k=Math.max(0,Math.min(f.frames.length-1,estado.k));estado.y=Math.max(0,Math.min(f.n-1,estado.y));
 $('frame').value=estado.k;$('fila').value=estado.y;
 dibujar(f,'',null);if(estado.modo==='dos'&&estado.corr)dibujar(estado.corr,'C',f);
 const v=$('vistaTexto'),q=$('filaValor');if(v)v.textContent=`${estado.k+1}/${f.frames.length} · ${Math.round(f.frames[estado.k].angle*180/Math.PI)}°`;if(q)q.textContent=estado.y+1;
}
function detener(){if(estado.timer){clearInterval(estado.timer);estado.timer=null;}$('play').textContent='▶';$('play').setAttribute('aria-label','Reproducir el cine');}
function reproducir(){
 if(estado.timer){detener();return;}
 $('play').textContent='■';$('play').setAttribute('aria-label','Detener el cine');
 estado.timer=setInterval(()=>{if(!estado.crudo)return;estado.k=(estado.k+1)%estado.crudo.frames.length;redibujar();},120);
}
// Tocar una imagen mueve los cursores que esa imagen tiene. En una columna tambien se puede
// arrastrar; en dos columnas el arrastre vertical queda para desplazar la pagina.
function tactil(c,ejes){
 let activo=false;
 const mover=e=>{
  if(!estado.crudo)return;const r=c.getBoundingClientRect(),fx=Math.max(0,Math.min(.9999,(e.clientX-r.left)/r.width)),fy=Math.max(0,Math.min(.9999,(e.clientY-r.top)/r.height));
  if(ejes.includes('k')){detener();estado.k=Math.floor(fx*estado.crudo.frames.length);}
  if(ejes.includes('y'))estado.y=Math.floor(fy*estado.crudo.n);
  redibujar();
 };
 c.addEventListener('pointerdown',e=>{activo=true;if(estado.modo!=='dos'){try{c.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();}mover(e);});
 c.addEventListener('pointermove',e=>{if(activo)mover(e);});
 const soltar=()=>{activo=false;};c.addEventListener('pointerup',soltar);c.addEventListener('pointercancel',soltar);c.addEventListener('pointerleave',soltar);
}
function abrir(id){const d=$(id);if(d&&!d.open){d.showModal();d.scrollTop=0;}}

$('archivo').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)cargar(f);});
$('cambiar').addEventListener('click',()=>{$('archivo').value='';$('archivo').click();});
$('modo').addEventListener('click',async()=>{
 if(!estado.crudo||estado.ocupado)return;
 if(!estado.corr){try{await corregir();}catch(err){$('resumen').textContent='No se pudo corregir: '+(err.message||err);console.error(err);$('modo').textContent='Corregir';estado.ocupado=false;return;}}
 estado.modo=estado.modo==='dos'?'uno':'dos';armar();window.scrollTo(0,0);
});
// Paso siguiente: registro SPECT/CT sobre la FBP de las proyecciones (corregidas si ya se corrigio).
async function aRegistro(){
 if(!estado.crudo||estado.ocupado)return;detener();
 $('qc').classList.add('oculta');$('reg').classList.remove('oculta');document.body.classList.remove('comparar');window.scrollTo(0,0);
 const f=estado.corr||estado.crudo;
 await Registro.abrir({s:f.s,fuente:estado.corr?'corregidas por la aplicación':'sin corregir',ctBytes:estado.ct,filaCorazon:estado.crudo.filaInicial});
}
async function aOsem(){
 if(!Registro.estado.confirmado)return;Registro.cancelar();
 $('reg').classList.add('oculta');$('osem').classList.remove('oculta');window.scrollTo(0,0);
 const r=Registro.estado;
 await OsemMovil.abrir({s:r.s,fuente:r.fuente,cortes:r.corte,registro:r});
}
// Segunda parte, sin cambiar de simulador: reorientar sobre la reconstruccion de la izquierda.
// Primero se ubica el corazon con una caja en coronal y sagital; despues se reorienta.
const mostrarSolo=id=>{for(const q of ['qc','reg','osem','caja','reo'])$(q).classList.toggle('oculta',q!==id);window.scrollTo(0,0);};
const entradaIzquierda=()=>{const o=OsemMovil.estado;return o.historial.find(h=>h.id===o.a);};
function aCaja(){mostrarSolo('caja');Caja.abrir({entrada:entradaIzquierda(),s:OsemMovil.estado.s});}
function aReorientar(){
 const ref=CARDIACO_CASOS[CASO]?.fases?.[FASE]?.eje||null;
 mostrarSolo('reo');
 Reorientar.abrir({entrada:Caja.estado.entrada,s:OsemMovil.estado.s,referencia:ref,caja:Caja.caja()});
}
function aOsemDesdeCaja(){mostrarSolo('osem');}
function aCajaDesdeReo(){mostrarSolo('caja');}
function aReg(){OsemMovil.cancelar();$('osem').classList.add('oculta');$('reg').classList.remove('oculta');window.scrollTo(0,0);}
function aQc(){Registro.cancelar();$('reg').classList.add('oculta');$('qc').classList.remove('oculta');armar();window.scrollTo(0,0);}
$('aRegistro').addEventListener('click',aRegistro);
$('volverQc').addEventListener('click',aQc);
$('aOsem').addEventListener('click',aOsem);
$('volverReg').addEventListener('click',aReg);
$('aCaja').addEventListener('click',aCaja);
$('aReorientar').addEventListener('click',aReorientar);
$('volverOsem').addEventListener('click',aOsemDesdeCaja);
$('volverCaja').addEventListener('click',aCajaDesdeReo);
Progreso.iniciar();
Registro.iniciar();
OsemMovil.iniciar();
Reorientar.iniciar();
Caja.iniciar();
$('frame').addEventListener('input',()=>{detener();estado.k=+$('frame').value;redibujar();});
$('fila').addEventListener('input',()=>{estado.y=+$('fila').value;redibujar();});
$('play').addEventListener('click',reproducir);
// Explicaciones en dialogos: «Ver mas» abre, «Cerrar» o tocar fuera cierra.
document.querySelectorAll('[data-dialogo]').forEach(b=>b.addEventListener('click',()=>abrir(b.dataset.dialogo)));
// La ventana de progreso no se cierra tocando fuera: solo al terminar o con «Detener».
document.querySelectorAll('dialog:not(#dProgreso)').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d)d.close();});d.querySelectorAll('[data-cerrar]').forEach(b=>b.addEventListener('click',()=>d.close()));});
window.MovilCardiaco={estado,cargar,mostrar,recuperar,redibujar,armar,corregir,aRegistro,aQc,aOsem,aReg,aCaja,aReorientar};
// Al abrir la pagina, si el telefono ya tiene el archivo guardado, se muestra sin pedir el ZIP.
recuperar();
