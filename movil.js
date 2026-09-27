/* Version movil del tutorial cardiaco, paso 1: cargar las proyecciones sin corregir del caso 1
   (estres) desde el ZIP de U-Cursos o desde el DICOM suelto, y mostrar cine, sinograma,
   linograma e imagen suma en una misma pantalla, conectados por dos cursores: la fila (linea
   amarilla horizontal) y la vista (linea celeste vertical). Reutiliza el motor de spect-lab-95
   (Lab95.read / Lab95.spect) y la logica del control de calidad del tutorial de escritorio. */
'use strict';
const CASO=1,FASE='estres';
const AMARILLA='rgba(255,238,88,.95)',CELESTE='rgba(77,208,225,.95)';
const $=id=>document.getElementById(id);
const dec=(x,d)=>Number(x).toFixed(d).replace('.',',');
const paleta=v=>{v=Math.max(0,Math.min(1,v));return [255*Math.min(1,v*3),255*Math.max(0,Math.min(1,v*3-1)),255*Math.max(0,v*3-2)];};
const estado={s:null,frames:[],n:0,k:0,y:64,max:1,timer:null,base:{},sinoFila:-1,aviso:''};

function imagen(img,w,h,max){
 const id=new ImageData(w,h);for(let i=0;i<w*h;i++){const c=paleta(Math.max(0,img[i])/(max||1));id.data[i*4]=c[0];id.data[i*4+1]=c[1];id.data[i*4+2]=c[2];id.data[i*4+3]=255;}
 return id;
}
function poner(canvas,id){if(canvas.width!==id.width||canvas.height!==id.height){canvas.width=id.width;canvas.height=id.height;}const ctx=canvas.getContext('2d');ctx.putImageData(id,0,0);return ctx;}
const lineaH=(ctx,y,w)=>{ctx.fillStyle=AMARILLA;ctx.fillRect(0,y,w,1);};
const lineaV=(ctx,x,h)=>{ctx.fillStyle=CELESTE;ctx.fillRect(x,0,1,h);};
function mensaje(texto,clase){const e=$('estado');e.textContent=texto;e.className='estado'+(clase?' '+clase:'');}

/* ---------- ZIP: solo lo necesario para sacar un archivo del ZIP de la entrega ---------- */
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
  if(typeof DecompressionStream==='undefined')throw Error('Este navegador no puede descomprimir el ZIP; descomprímelo y elige NM_estres.dcm.');
  const ds=new DecompressionStream('deflate-raw');const salida=await new Response(new Blob([comp]).stream().pipeThrough(ds)).arrayBuffer();return new Uint8Array(salida);
 }
 throw Error('Método de compresión no admitido ('+entrada.method+').');
}
// Busca la cruda de estres del caso: NM_estres.dcm dentro de una carpeta «Caso 1», sin la copia QC ni la gatillada.
function elegirEntrada(lista){
 const crudas=lista.filter(e=>/(^|\/)NM_estres\.dcm$/i.test(e.name));
 if(!crudas.length)return null;
 return crudas.find(e=>/caso\s*1(\/|$)/i.test(e.name.replace(/\\/g,'/')))||crudas[0];
}

/* ---------- carga ---------- */
async function cargar(file){
 try{
  mensaje('Leyendo '+file.name+'…');
  let blob=file,origen=file.name;
  if(/\.zip$/i.test(file.name)||file.type==='application/zip'||file.type==='application/x-zip-compressed'){
   const buf=await file.arrayBuffer();const lista=await entradasZip(buf);const e=elegirEntrada(lista);
   if(!e)throw Error('Dentro del ZIP no hay NM_estres.dcm. Revisa que sea el ZIP «Cardiaco …» de U-Cursos.');
   mensaje('Descomprimiendo '+e.name+'…');const datos=await extraer(buf,e);blob=new Blob([datos]);origen=e.name;
  }
  const d=await Lab95.read(blob);const s=Lab95.spect(d);
  const marco=CARDIACO_CASOS[CASO].fases[FASE].marco,esDelCaso=cardiacoHash(s.frame)===marco;
  estado.s=s;estado.aviso=esDelCaso?'':'Atención: este archivo no es el estrés del caso 1. Se muestra igual. ';
  mensaje((esDelCaso?'Proyecciones del caso 1, estrés: ':'Atención: este archivo no es el estrés del caso 1 (se muestra igual). ')+origen,esDelCaso?'ok':'error');
  const c=CARDIACO_CASOS[CASO].clinica;$('antecedenteTexto').textContent=c.antecedentes;$('procedimientoTexto').textContent=c.procedimiento;$('antecedente').hidden=false;
  prepararQc(s);
  $('qc').classList.remove('oculta');$('carga').classList.add('oculta');$('cambiar').hidden=false;window.scrollTo(0,0);
 }catch(err){mensaje(err.message||String(err),'error');console.error(err);}
}

/* ---------- control de calidad: mismas cuentas que el bloque de escritorio ---------- */
function prepararQc(s){
 const fr=s.views.filter(v=>v.window===1&&v.slot===1).sort((a,b)=>a.angle-b.angle),n=s.n,p=n*n;
 estado.frames=fr;estado.n=n;estado.k=0;estado.sinoFila=-1;detener();
 let max=0;for(const v of fr){const a=s.data.subarray(v.source*p,(v.source+1)*p);for(let i=0;i<p;i++)if(a[i]>max)max=a[i];}
 estado.max=max*.8||1;$('frame').max=fr.length-1;$('fila').max=n-1;
 const suma=new Float32Array(p),lino=new Float32Array(fr.length*n);let total=0;
 fr.forEach((v,k)=>{const a=s.data.subarray(v.source*p,(v.source+1)*p);for(let i=0;i<p;i++){suma[i]+=a[i];total+=a[i];}for(let y=0;y<n;y++){let q=0;for(let x=0;x<n;x++)q+=a[y*n+x];lino[y*fr.length+k]=q;}});
 let mi=0,smax=0;for(let i=0;i<p;i++){if(suma[i]>suma[mi])mi=i;if(suma[i]>smax)smax=suma[i];}estado.y=Math.floor(mi/n);
 let lmax=0;for(let i=0;i<lino.length;i++)if(lino[i]>lmax)lmax=lino[i];
 estado.base.suma=imagen(suma,n,n,smax*.9);estado.base.lino=imagen(lino,fr.length,n,lmax);
 const porVista=Math.round(total/fr.length);
 $('cuentas').textContent=`Este archivo trae ${fr.length} vistas repartidas en ${s.arc} grados de giro. Cada vista es una imagen de ${s.n} × ${s.n} píxeles, y cada píxel mide ${dec(s.spacing,1)} mm. En total se detectaron ${dec(total/1e6,2)} millones de fotones con la energía del tecnecio (a cada fotón detectado se le llama «cuenta»), unas ${dec(porVista/1000,0)} mil por vista. Mientras más cuentas tiene una imagen, menos granulada se ve.`;
 // Movimiento axial: corrimiento entero del perfil axial de cada vista respecto de la vecina.
 const perfil=k=>{const q=new Float64Array(n);for(let y=0;y<n;y++)q[y]=lino[y*fr.length+k];return q;};
 let salto=0,deriva=0,prev=perfil(0);
 for(let k=1;k<fr.length;k++){const cur=perfil(k);let mejor=Infinity,mdy=0;for(let dy=-6;dy<=6;dy++){let ssd=0;for(let y=8;y<n-8;y++){const q=cur[y]-prev[y+dy];ssd+=q*q;}if(ssd<mejor){mejor=ssd;mdy=dy;}}salto=Math.max(salto,Math.abs(mdy));deriva+=mdy;prev=cur;}
 $('medida').textContent=`Medida automática del movimiento a lo largo de la camilla. El programa compara cada vista con la siguiente y busca cuántos píxeles habría que subirla o bajarla para que calcen. El mayor salto que encontró fue de ${salto} ${salto===1?'píxel':'píxeles'} (${dec(salto*s.spacing,1)} mm), y la suma de todos los saltos de la órbita da ${dec(Math.abs(deriva)*s.spacing,1)} mm. Es una ayuda, no un veredicto: cuando hay pocas cuentas el ruido puede parecer un salto. Compárala con lo que ves en el linograma y en el cine.`;
 // Franja sin dato: columnas completas con cero cuentas exactas en el borde de cada vista.
 let anchoMax=0,afectadas=0;const anchos=fr.map(v=>{const a=s.data.subarray(v.source*p,(v.source+1)*p);const vacia=x=>{for(let y=0;y<n;y++)if(a[y*n+x]>0)return false;return true;};let izq=0;while(izq<n&&vacia(izq))izq++;let der=0;while(der<n-izq&&vacia(n-1-der))der++;return izq+der;});
 anchos.forEach(w=>{if(w>0)afectadas++;if(w>anchoMax)anchoMax=w;});estado.franja=anchos;
 $('franja').textContent=afectadas?`En este archivo, ${afectadas} de las ${fr.length} vistas tienen una franja sin medición en un borde. La más ancha ocupa ${anchoMax} píxeles, es decir ${dec(anchoMax*s.spacing,0)} mm de los ${dec(n*s.spacing,0)} mm que mide la imagen de lado a lado.`:'En este archivo ninguna vista tiene franjas sin medición.';
 $('resumen').textContent=`${estado.aviso}${fr.length} vistas en ${s.arc}° · ${dec(total/1e6,2)} millones de cuentas · franja sin medición de hasta ${dec(anchoMax*s.spacing,0)} mm · salto máximo medido a lo largo de la camilla: ${salto} ${salto===1?'píxel':'píxeles'}.`;
 redibujar();
}

/* ---------- las cuatro imagenes comparten dos cursores: fila (y) y vista (k) ---------- */
function redibujar(){
 const s=estado.s;if(!s)return;const fr=estado.frames,n=s.n,p=n*n;
 const k=estado.k=Math.max(0,Math.min(fr.length-1,estado.k)),y=estado.y=Math.max(0,Math.min(n-1,estado.y));
 $('frame').value=k;$('fila').value=y;$('filaValor').textContent=y+1;
 $('vistaTexto').textContent=`${k+1}/${fr.length} · ${Math.round(fr[k].angle*180/Math.PI)}°`;
 // Cine: la vista k, con la fila marcada.
 lineaH(poner($('cine'),imagen(s.data.subarray(fr[k].source*p,(fr[k].source+1)*p),n,n,estado.max)),y,n);
 // Imagen suma, con la fila marcada.
 lineaH(poner($('suma'),estado.base.suma),y,n);
 // Sinograma de la fila y (solo se recalcula si cambio la fila), con la vista marcada.
 if(estado.sinoFila!==y){const img=new Float32Array(fr.length*n);let max=0;fr.forEach((v,q)=>{for(let x=0;x<n;x++){const c=s.data[v.source*p+y*n+x];img[x*fr.length+q]=c;if(c>max)max=c;}});estado.base.sino=imagen(img,fr.length,n,max*.9);estado.sinoFila=y;}
 lineaV(poner($('sino'),estado.base.sino),k,n);
 // Linograma, con la vista y la fila marcadas.
 const ctx=poner($('lino'),estado.base.lino);lineaH(ctx,y,fr.length);lineaV(ctx,k,n);
}
function detener(){if(estado.timer){clearInterval(estado.timer);estado.timer=null;}$('play').textContent='▶';$('play').setAttribute('aria-label','Reproducir el cine');}
function reproducir(){
 if(estado.timer){detener();return;}
 $('play').textContent='■';$('play').setAttribute('aria-label','Detener el cine');
 estado.timer=setInterval(()=>{if(!estado.s)return;estado.k=(estado.k+1)%estado.frames.length;redibujar();},120);
}
// Tocar o arrastrar sobre una imagen mueve los cursores que esa imagen tiene.
function tactil(id,ejes){
 const c=$(id);let activo=false;
 const mover=e=>{
  if(!estado.s)return;const r=c.getBoundingClientRect(),fx=Math.max(0,Math.min(.9999,(e.clientX-r.left)/r.width)),fy=Math.max(0,Math.min(.9999,(e.clientY-r.top)/r.height));
  if(ejes.includes('k')){detener();estado.k=Math.floor(fx*estado.frames.length);}
  if(ejes.includes('y'))estado.y=Math.floor(fy*estado.n);
  redibujar();
 };
 c.addEventListener('pointerdown',e=>{activo=true;try{c.setPointerCapture(e.pointerId);}catch(err){}mover(e);e.preventDefault();});
 c.addEventListener('pointermove',e=>{if(activo)mover(e);});
 const soltar=()=>{activo=false;};c.addEventListener('pointerup',soltar);c.addEventListener('pointercancel',soltar);
}
tactil('cine','y');tactil('suma','y');tactil('sino','k');tactil('lino','ky');

$('archivo').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)cargar(f);});
$('cambiar').addEventListener('click',()=>{$('archivo').value='';$('archivo').click();});
$('frame').addEventListener('input',()=>{detener();estado.k=+$('frame').value;redibujar();});
$('fila').addEventListener('input',()=>{estado.y=+$('fila').value;redibujar();});
$('play').addEventListener('click',reproducir);
// Explicaciones en dialogos: «Ver mas» abre, «Cerrar» o tocar fuera cierra.
document.querySelectorAll('[data-dialogo]').forEach(b=>b.addEventListener('click',()=>{const d=$(b.dataset.dialogo);if(d&&!d.open){d.showModal();d.scrollTop=0;}}));
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d)d.close();});d.querySelectorAll('[data-cerrar]').forEach(b=>b.addEventListener('click',()=>d.close()));});
window.MovilCardiaco={estado,cargar,redibujar};
