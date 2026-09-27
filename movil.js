/* Version movil del tutorial cardiaco, paso 1. Carga el ZIP de U-Cursos, saca las proyecciones
   de estres del caso 1 (la cruda y la copia corregida por el equipo) y muestra cine, sinograma,
   linograma e imagen suma. Dos vistas: «una columna» (las cuatro imagenes de la cruda en una
   pantalla) y «vista corregido» (dos columnas: sin corregir a la izquierda, corregido a la
   derecha; proyecciones y sinograma arriba, suma y linograma bajando). Todas las imagenes
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
const estado={crudo:null,corr:null,k:0,y:64,modo:'uno',timer:null,aviso:'',resumen:'',comparacion:''};

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
// La cruda de estres (NM_estres.dcm, de preferencia en una carpeta «Caso 1») y, en la misma
// carpeta, la copia corregida por el equipo (NM_estres_QC_corregido.dcm).
function elegirEntradas(lista){
 const crudas=lista.filter(e=>/(^|\/)NM_estres\.dcm$/i.test(e.name));
 if(!crudas.length)return null;
 const cruda=crudas.find(e=>/caso\s*1(\/|$)/i.test(e.name.replace(/\\/g,'/')))||crudas[0];
 const carpeta=cruda.name.slice(0,cruda.name.length-'NM_estres.dcm'.length);
 const corregida=lista.find(e=>e.name.toLowerCase()===(carpeta+'NM_estres_QC_corregido.dcm').toLowerCase())||null;
 return {cruda,corregida};
}

/* ---------- carga ---------- */
async function cargar(file){
 try{
  mensaje('Leyendo '+file.name+'…');
  let crudo,corr=null,origen=file.name;
  if(/\.zip$/i.test(file.name)||/zip/.test(file.type)){
   const buf=await file.arrayBuffer();const lista=await entradasZip(buf);const e=elegirEntradas(lista);
   if(!e)throw Error('Dentro del ZIP no hay NM_estres.dcm. Revisa que sea el ZIP «Cardiaco …» de U-Cursos.');
   mensaje('Descomprimiendo las proyecciones…');origen=e.cruda.name;
   crudo=Lab95.spect(await Lab95.read(new Blob([await extraer(buf,e.cruda)])));
   if(e.corregida){try{corr=Lab95.spect(await Lab95.read(new Blob([await extraer(buf,e.corregida)])));}catch(err){corr=null;console.warn('copia corregida no legible',err);}}
  }else crudo=Lab95.spect(await Lab95.read(file));
  const marco=CARDIACO_CASOS[CASO].fases[FASE].marco,esDelCaso=cardiacoHash(crudo.frame)===marco;
  if(corr&&(corr.frame!==crudo.frame||corr.n!==crudo.n))corr=null;
  estado.aviso=esDelCaso?'':'Atención: este archivo no es el estrés del caso 1. Se muestra igual. ';
  mensaje((esDelCaso?'Proyecciones del caso 1, estrés: ':'Atención: este archivo no es el estrés del caso 1 (se muestra igual). ')+origen,esDelCaso?'ok':'error');
  const c=CARDIACO_CASOS[CASO].clinica;$('antecedenteTexto').textContent=c.antecedentes;$('procedimientoTexto').textContent=c.procedimiento;$('antecedente').hidden=false;
  detener();estado.k=0;
  estado.crudo=preparar(crudo,null);estado.corr=corr?preparar(corr,estado.crudo):null;
  estado.y=estado.crudo.filaInicial;
  textos();
  const b=$('modo');b.disabled=!estado.corr;if(!estado.corr)estado.modo='uno';
  $('qc').classList.remove('oculta');$('carga').classList.add('oculta');$('cambiar').hidden=false;
  armar();window.scrollTo(0,0);
 }catch(err){mensaje(err.message||String(err),'error');console.error(err);}
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
 // Comparacion con la copia corregida, vista por vista.
 const c=estado.corr;
 if(!c){estado.comparacion='El ZIP no trae una copia corregida de esta adquisición, o no se pudo leer.';}
 else{
  let distintas=0,maxY=0,maxX=0;const m=Math.min(fr.length,c.frames.length);
  for(let k=0;k<m;k++){
   const a=s.data.subarray(fr[k].source*p,(fr[k].source+1)*p),b=c.s.data.subarray(c.frames[k].source*p,(c.frames[k].source+1)*p);
   let igual=true;for(let i=0;i<p;i++)if(a[i]!==b[i]){igual=false;break;}
   if(igual)continue;distintas++;
   const ay=new Float64Array(n),by=new Float64Array(n),ax=new Float64Array(n),bx=new Float64Array(n);
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){const q=a[y*n+x],r=b[y*n+x];ay[y]+=q;by[y]+=r;ax[x]+=q;bx[x]+=r;}
   maxY=Math.max(maxY,Math.abs(corrimiento(by,ay,n)));maxX=Math.max(maxX,Math.abs(corrimiento(bx,ax,n)));
  }
  estado.comparacion=distintas===0
   ?`En este archivo la copia corregida es idéntica a la original: las ${m} vistas tienen exactamente las mismas cuentas, píxel por píxel. El equipo guardó la copia pero no desplazó ninguna proyección, así que las dos columnas se ven iguales. Eso también es un resultado: el equipo no encontró movimiento que corregir, o no se le pidió corregir.`
   :`En este archivo, ${distintas} de las ${m} vistas de la copia corregida son distintas de la original. El mayor desplazamiento que el equipo aplicó fue de ${maxY} ${maxY===1?'píxel':'píxeles'} a lo largo de la camilla (${dec(maxY*s.spacing,1)} mm) y de ${maxX} ${maxX===1?'píxel':'píxeles'} hacia el lado (${dec(maxX*s.spacing,1)} mm). Si el programa mide 0 píxeles en una dirección, el desplazamiento fue menor que un píxel.`;
  estado.difieren=distintas;
 }
 $('comparacion').textContent=estado.comparacion;
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
 const b=$('modo');b.setAttribute('aria-pressed',String(dos));b.textContent=dos?'Volver a una columna':'Vista corregido';
 b.title=estado.corr?'':'El ZIP no trae copia corregida';
 if(!dos){
  for(const tipo of ['cine','suma','sino','lino']){const f=figura(tipo,'',TIPOS[tipo]);f.append(verMas(DIALOGO[tipo],'Ver más'));r.append(f);}
  $('resumen').textContent=estado.resumen+(estado.corr?'':' El ZIP no trae copia corregida.');
 }else{
  const t1=document.createElement('div'),t2=document.createElement('div');t1.className=t2.className='columna';t1.textContent='Sin corregir';t2.textContent='Corregido';r.append(t1,t2);
  // Primera fila las proyecciones, segunda el sinograma; bajando, suma y linograma.
  for(const tipo of ['cine','sino','suma','lino']){r.append(figura(tipo,'',TIPOS[tipo]),figura(tipo,'C',TIPOS[tipo]),verMas(DIALOGO[tipo],'Ver más sobre '+TIPOS[tipo].toLowerCase().replace('imagen suma','la imagen suma').replace(/^(cine|sinograma|linograma)$/,'el $1'),'doble'));}
  r.append(verMas('dCorregido','Ver más sobre la comparación','doble'));
  $('resumen').textContent=estado.aviso+(estado.difieren?`La copia corregida difiere de la original en ${estado.difieren} vistas.`:'La copia corregida es idéntica a la original: el equipo no desplazó ninguna proyección.')+' Toca «Ver más sobre la comparación».';
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
$('modo').addEventListener('click',()=>{if(!estado.corr)return;estado.modo=estado.modo==='dos'?'uno':'dos';armar();window.scrollTo(0,0);});
$('frame').addEventListener('input',()=>{detener();estado.k=+$('frame').value;redibujar();});
$('fila').addEventListener('input',()=>{estado.y=+$('fila').value;redibujar();});
$('play').addEventListener('click',reproducir);
// Explicaciones en dialogos: «Ver mas» abre, «Cerrar» o tocar fuera cierra.
document.querySelectorAll('[data-dialogo]').forEach(b=>b.addEventListener('click',()=>abrir(b.dataset.dialogo)));
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d)d.close();});d.querySelectorAll('[data-cerrar]').forEach(b=>b.addEventListener('click',()=>d.close()));});
window.MovilCardiaco={estado,cargar,redibujar,armar};
