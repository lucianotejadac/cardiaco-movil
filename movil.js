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
const estado={crudo:null,corr:null,ct:null,gat:null,equipo:[],cuadros:null,correccion:null,ocupado:false,k:0,y:64,modo:'uno',timer:null,aviso:'',resumen:'',comparacion:''};

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
 // Si hay varias series de CT de la fase («CT 512» y «CT 128», caso 4), se usa una sola: la
 // «CT 512», el CT tal como salio del tomografo; si no esta, la primera carpeta «CT …».
 const cts=lista.filter(e=>{const q=e.name.toLowerCase();return q.startsWith(carpeta)&&/^ct[^/]*\/[^/]+\.dcm$/.test(q.slice(carpeta.length));});
 const carpetasCt=[...new Set(cts.map(e=>e.name.toLowerCase().slice(carpeta.length).split('/')[0]))].sort();
 const carpetaCt=carpetasCt.find(c=>/^ct\s*512$/.test(c))||carpetasCt[0];
 const ct=cts.filter(e=>e.name.toLowerCase().slice(carpeta.length).split('/')[0]===carpetaCt).sort((a,b)=>a.name.localeCompare(b.name));
 // La adquisicion gatillada de la misma fase, para el paso del gatillado.
 const gat=lista.find(e=>e.name.toLowerCase()===carpeta+'nm_estres_gatillado.dcm')||null;
 // La reconstruccion transaxial del equipo (Siemens), si el ZIP la trae en «Referencia equipo»,
 // con las proyecciones de esa misma fase: sirve para reorientar sobre la reconstruccion del
 // equipo y para mostrar en las proyecciones donde esta el corazon.
 // Puede haber una por fase (caso 4: estres y reposo); se ofrecen todas.
 const equipo=[];
 for(const rec of lista.filter(e=>/(^|\/)caso\s*\d+\/(estres|reposo)\/referencia equipo\/recon_transversal_noac\.dcm$/i.test(e.name))){
  const m=rec.name.match(/caso\s*(\d+)\/(estres|reposo)\//i),fase=m[2].toLowerCase(),dir=rec.name.slice(0,rec.name.toLowerCase().indexOf('referencia equipo/')).toLowerCase();
  const f=nombre=>lista.find(e=>e.name.toLowerCase()===dir+nombre)||null,ref=nombre=>f('referencia equipo/'+nombre);
  const proy=f('nm_'+fase+'.dcm');
  // Tambien los ejes cortos y el gatillado de Siemens, la gatillada de esa fase y su CT (para AC).
  const cts=lista.filter(e=>{const q=e.name.toLowerCase();return q.startsWith(dir)&&/^ct[^/]*\/[^/]+\.dcm$/.test(q.slice(dir.length));});
  const cc=[...new Set(cts.map(e=>e.name.toLowerCase().slice(dir.length).split('/')[0]))].sort(),c512=cc.find(c=>/^ct\s*512$/.test(c))||cc[0];
  if(proy)equipo.push({rec,proy,proyQC:f('nm_'+fase+'_qc_corregido.dcm'),saNoAC:ref('recon_eje_corto_noac.dcm'),saAC:ref('recon_eje_corto_ac.dcm'),saGat:ref('recon_gatillado_eje_corto.dcm'),proyGat:f('nm_'+fase+'_gatillado.dcm'),
   ct:cts.filter(e=>e.name.toLowerCase().slice(dir.length).split('/')[0]===c512).sort((a,b)=>a.name.localeCompare(b.name)),caso:+m[1],fase});}
 equipo.sort((a,b)=>a.fase.localeCompare(b.fase));
 return {cruda,ct,gat,equipo};
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
async function guardar(bytes,origen,ct,gat,equipo,ejes){
 try{await memoria('guardar',{bytes,origen,ct,gat,equipo,ejes:ejes||null,fecha:Date.now()});if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});}
 catch(err){console.warn('No se pudo guardar en el teléfono',err);}
}
async function recuperar(){
 let m=null;try{m=await memoria('leer');}catch(err){console.warn('No se pudo leer lo guardado',err);}
 if(m&&m.bytes)await mostrar(m.bytes,m.origen,true,m.ct||null,m.gat||null,m.equipo||null,m.ejes||null);
}

/* ---------- archivos sueltos o carpeta (provisional) ---------- */
// Lee solo el encabezado de cada archivo (hasta los pixeles) y elige las proyecciones crudas de
// estres: NM tomografica original, ni gatillada ni reconstruida. Prefiere la que dice estres y la
// que no fue corregida por el equipo. Despues busca, con el mismo marco de referencia, el CT axial
// (de preferencia el original, no el remuestreado por el equipo) y la gatillada sin corregir.
// No lee ni muestra datos de identidad.
const TROZO=1<<20,PROPIO='Archivo propio: ';
async function encabezado(file){
 const intento=async blob=>{const u8=new Uint8Array(await blob.arrayBuffer());if(u8.length<136||u8[128]!==68||u8[129]!==73||u8[130]!==67||u8[131]!==77)return null;return dicomParser.parseDicom(u8,{untilTag:'x7fe00010'});};
 let d=null;
 try{d=await intento(file.size>TROZO?file.slice(0,TROZO):file);}catch(e){try{d=await intento(file);}catch(e2){return null;}}
 if(!d)return null;
 const t=tag=>(d.string(tag)||'').trim();
 return {file,modalidad:t('x00080060'),tipo:t('x00080008'),descripcion:t('x0008103e'),marco:t('x00200052'),serie:t('x0020000e'),filas:d.uint16('x00280010')||0,intervalos:d.uint16('x00540071')||1,nucleo:t('x00181210')};
}
async function elegirArchivos(files){
 const lista=Array.from(files).filter(f=>f.size>=136&&f.size<=6e7&&!/\.(zip|rar|7z|pdf|txt|jpg|jpeg|png|xml|html?|exe|ini|inf)$/i.test(f.name)&&!/^dicomdir$/i.test(f.name));
 const todos=[];let leidos=0;
 for(const f of lista){
  const e=await encabezado(f);leidos++;if(e)todos.push(e);
  if(leidos%20===0){mensaje(`Revisando los archivos… ${leidos} de ${lista.length}`);await new Promise(r=>setTimeout(r,0));}
 }
 const tomo=e=>e.modalidad==='NM'&&/TOMO/.test(e.tipo)&&!/RECON/.test(e.tipo);
 const puntos=e=>(/stress|estr[eé]s|esfuerzo/i.test(e.descripcion)?2:0)+(/correct|corregid/i.test(e.descripcion)?0:1);
 const mejor=a=>a.slice().sort((x,y)=>puntos(y)-puntos(x))[0]||null;
 const cruda=mejor(todos.filter(e=>tomo(e)&&!/GATED/.test(e.tipo)&&e.intervalos<=1));
 if(!cruda)throw Error(`Entre los ${lista.length} archivos no hay proyecciones tomográficas originales sin sincronizar. Revisa que la carpeta sea la del examen completo.`);
 // CT axial del mismo marco de referencia: una sola serie, de preferencia la de matriz 512.
 const cortes=todos.filter(e=>e.modalidad==='CT'&&/AXIAL/.test(e.tipo)&&e.marco&&e.marco===cruda.marco),series=new Map();
 for(const e of cortes){if(!series.has(e.serie))series.set(e.serie,[]);series.get(e.serie).push(e);}
 const valor=a=>(a[0].filas===512?2:0)+(/transformed/i.test(a[0].descripcion)?0:1);
 const serieCt=[...series.values()].filter(a=>a.length>=2).sort((a,b)=>valor(b)-valor(a)||b.length-a.length)[0]||[];
 const gat=mejor(todos.filter(e=>tomo(e)&&(/GATED/.test(e.tipo)||e.intervalos>1)&&e.marco===cruda.marco&&!/correct|corregid/i.test(e.descripcion)));
 const bytes=async f=>new Uint8Array(await f.arrayBuffer());
 mensaje('Leyendo las proyecciones…');
 // Reconstrucciones del equipo hechas con OSEM, no gatilladas, del mismo marco: entre ellas
 // esta el eje corto que usa la reorientacion (eje-equipo.js decide cual sirve).
 const recon=todos.filter(e=>e.modalidad==='NM'&&/RECON/.test(e.tipo)&&!/GATED/.test(e.tipo)&&e.intervalos<=1&&e.marco===cruda.marco&&/OSEM/i.test(e.nucleo));
 const r={bytes:await bytes(cruda.file),ct:null,gat:null,ejes:[]};
 if(serieCt.length){mensaje('Leyendo el CT…');r.ct=[];for(const e of serieCt)r.ct.push(await bytes(e.file));}
 if(gat){mensaje('Leyendo la adquisición gatillada…');r.gat=await bytes(gat.file);}
 if(recon.length){mensaje('Leyendo las reconstrucciones del equipo…');for(const e of recon)r.ejes.push(await bytes(e.file));}
 r.origen=`${PROPIO}serie «${cruda.descripcion||'sin descripción'}», elegida entre ${lista.length} ${lista.length===1?'archivo':'archivos'}; ${r.ct?r.ct.length+' cortes de CT':'sin CT'}; ${r.gat?'con':'sin'} adquisición gatillada; ${r.ejes.length?r.ejes.length+' '+(r.ejes.length===1?'reconstrucción':'reconstrucciones')+' del equipo':'sin reconstrucciones del equipo'}`;
 return r;
}

/* ---------- carga ---------- */
async function cargar(entrada){
 try{
  let file=entrada;
  if(!(entrada instanceof Blob)){
   const varios=Array.from(entrada||[]);if(!varios.length)return;
   if(varios.length===1&&(/\.zip$/i.test(varios[0].name)||/zip/.test(varios[0].type)))file=varios[0];
   else{
    mensaje(`Revisando ${varios.length} ${varios.length===1?'archivo':'archivos'}…`);
    const e=await elegirArchivos(varios);
    if(await mostrar(e.bytes,e.origen,false,e.ct,e.gat,null,e.ejes))await guardar(e.bytes,e.origen,e.ct,e.gat,null,e.ejes);
    return;
   }
  }
  mensaje('Leyendo '+file.name+'…');
  let bytes,origen=file.name,ct=null,gat=null,equipo=null;
  if(/\.zip$/i.test(file.name)||/zip/.test(file.type)){
   const buf=await file.arrayBuffer();const lista=await entradasZip(buf);const e=elegirEntradas(lista);
   if(!e)throw Error('Dentro del ZIP no hay NM_estres.dcm. Revisa que sea el ZIP «Cardiaco …» de U-Cursos.');
   mensaje('Descomprimiendo las proyecciones…');origen=e.cruda.name;
   bytes=await extraer(buf,e.cruda);
   if(e.ct.length){mensaje('Descomprimiendo el CT…');ct=[];for(const q of e.ct)ct.push(await extraer(buf,q));}
   if(e.gat){mensaje('Descomprimiendo la adquisición gatillada…');gat=await extraer(buf,e.gat);}
   if(e.equipo.length){mensaje('Descomprimiendo la reconstrucción del equipo…');equipo=[];const x=async q=>q?await extraer(buf,q):null;for(const q of e.equipo){const ct=[];for(const c of q.ct)ct.push(await extraer(buf,c));equipo.push({recon:await x(q.rec),proy:await x(q.proy),proyQC:await x(q.proyQC),saNoAC:await x(q.saNoAC),saAC:await x(q.saAC),saGat:await x(q.saGat),proyGat:await x(q.proyGat),ct,caso:q.caso,fase:q.fase});}}
  }else bytes=new Uint8Array(await file.arrayBuffer());
  if(await mostrar(bytes,origen,false,ct,gat,equipo))await guardar(bytes,origen,ct,gat,equipo);
 }catch(err){mensaje(err.message||String(err),'error');console.error(err);}
}
// Muestra un DICOM ya extraido. Devuelve true si se pudo leer.
async function mostrar(bytes,origen,recuperado,ct,gat,equipo,ejes){
 try{
  const d=await Lab95.read(new Blob([bytes]));
  const crudo=Lab95.spect(d);
  // De que cabezal y de que paso del giro es cada cuadro: lo necesita la correccion.
  estado.cuadros=Array.from({length:crudo.frames},(_,i)=>({cabezal:d.uint16('x00540020',i),ventana:d.uint16('x00540010',i),paso:d.uint16('x00540090',i)}));
  const marco=CARDIACO_CASOS[CASO].fases[FASE].marco,esDelCaso=cardiacoHash(crudo.frame)===marco;
  // Un archivo propio (cargado suelto o por carpeta) que no es del caso 1 se muestra sin la
  // advertencia en rojo y sin los antecedentes del caso 1.
  const propio=!esDelCaso&&String(origen).startsWith(PROPIO);estado.esDelCaso=esDelCaso;
  estado.aviso=esDelCaso?'':propio?'Archivo propio, no es el caso 1. ':'Atención: este archivo no es el estrés del caso 1. Se muestra igual. ';
  mensaje((esDelCaso?'Proyecciones del caso 1, estrés: ':propio?'':'Atención: este archivo no es el estrés del caso 1 (se muestra igual). ')+(esDelCaso?String(origen).replace(PROPIO,''):origen)+(recuperado?' (guardado en este teléfono)':''),esDelCaso||propio?'ok':'error');
  $('titulo').textContent=esDelCaso?'SPECT cardíaco · Caso 1 · Estrés':'SPECT cardíaco · '+(crudo.description||'archivo propio');
  const c=CARDIACO_CASOS[CASO].clinica;$('antecedenteTexto').textContent=c.antecedentes;$('procedimientoTexto').textContent=c.procedimiento;$('antecedente').hidden=!esDelCaso;
  detener();estado.k=0;
  estado.crudo=preparar(crudo,null);estado.corr=null;estado.correccion=null;estado.modo='uno';
  estado.ct=ct&&ct.length?ct:null;estado.gat=gat||null;EjeEquipo.configurar(ejes);Qps.olvidar();// Lo guardado antes de este cambio traia una sola reconstruccion (objeto): se pasa a lista.
  estado.equipo=equipo?(Array.isArray(equipo)?equipo:[equipo]):[];
  $('equipoBotones').replaceChildren(...estado.equipo.flatMap((q,i)=>{const fase=q.fase==='reposo'?'reposo':'estrés',boton=(texto,f)=>{const b=document.createElement('button');b.type='button';b.className='boton ancho secundario';b.textContent=texto;b.addEventListener('click',f);return b;};
   return [boton(`Comparar Siemens con el simulador (caso ${q.caso}, ${fase}) →`,()=>aComparar(i)),boton(`Reorientar con la reconstrucción del equipo (caso ${q.caso}, ${fase}) →`,()=>aEquipo(i))];}));Registro.olvidar();OsemMovil.olvidar();Reorientar.olvidar();Caja.olvidar();Gatillado.olvidar();$('gat').classList.add('oculta');$('reg').classList.add('oculta');$('osem').classList.add('oculta');$('caja').classList.add('oculta');$('reo').classList.add('oculta');
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
for(const id of ['archivos','carpeta'])$(id).addEventListener('change',e=>{const f=e.target.files;if(f&&f.length)cargar(f);});
// «Cambiar archivo» vuelve a la tarjeta de carga, donde estan las tres formas de cargar. Lo que
// estaba cargado sigue en memoria hasta que se elija otro.
$('cambiar').addEventListener('click',()=>{detener();for(const id of ['archivo','archivos','carpeta'])$(id).value='';document.querySelectorAll('main > section').forEach(s=>s.classList.toggle('oculta',s.id!=='carga'));$('cambiar').hidden=true;document.body.classList.remove('comparar');mensaje('Elige otro archivo, o recarga la página para volver al que estaba.');window.scrollTo(0,0);});
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
const mostrarSolo=id=>{if(id!=='gat')Gatillado.salir();if(id!=='cmp')Comparador.salir();for(const q of ['qc','reg','osem','gat','caja','reo','cmp','qps'])$(q).classList.toggle('oculta',q!==id);window.scrollTo(0,0);};
const entradaIzquierda=()=>{const o=OsemMovil.estado;return o.historial.find(h=>h.id===o.a);};
// De donde se vino a la caja (la OSEM o el control de calidad) y con que volumen se trabaja.
const segunda={origen:'osem',s:null,referencia:null,directo:null};
function aCaja(){
 // OSEM de la aplicacion: voxel (con z hacia la cabeza) -> paciente, con la geometria de la cruda.
 const s=estado.crudo.s,n=s.n,c=(n-1)/2;
 RefProy.configurar(s,(i,j,k)=>[(i-c)*s.spacing+s.origin[0],(j-c)*s.spacing+s.origin[1],s.z0-(n-1-k)*s.spacing]);
 Object.assign(segunda,{directo:null,origen:'osem',s:OsemMovil.estado.s,referencia:estado.esDelCaso?(CARDIACO_CASOS[CASO]?.fases?.[FASE]?.eje||null):null});
 $('volverOsem').textContent='← Volver a la OSEM';
 mostrarSolo('caja');Caja.abrir({entrada:entradaIzquierda(),s:segunda.s});
}
// Reconstruccion transaxial del equipo: se lee con el lector de la segunda parte de escritorio
// (cardiaco-core), que deja z hacia la cabeza, y las proyecciones de la misma fase dan la referencia.
let equipoLeido=null;
async function aEquipo(i=0){
 const q=estado.equipo[i];if(!q)return;
 try{
  if(!equipoLeido||equipoLeido.bytes!==q.recon){
   const v=await CardiacoCore.leerVolumen(new File([q.recon],'Recon_transversal_NoAC.dcm'));
   if(v.nz!==v.n)throw Error(`La reconstrucción tiene ${v.nz} cortes de ${v.n} × ${v.n}; se espera un volumen cúbico.`);
   const s=Lab95.spect(await Lab95.read(new Blob([q.proy])));
   equipoLeido={bytes:q.recon,v,s,entrada:{tipo:'equipo',zArriba:true,data:v.data[0],etiqueta:`equipo · ${v.descripcion||'transversal NoAC'}`}};
  }
  const {v,s,entrada}=equipoLeido,pos=v.posicion||[0,0,0];
  RefProy.configurar(s,(i,j,k)=>[pos[0]+i*v.spacing,pos[1]+j*v.spacing,pos[2]+k*v.dz]);
  Object.assign(segunda,{directo:null,origen:'qc',s:{n:v.n,spacing:v.spacing},referencia:CARDIACO_CASOS[q.caso]?.fases?.[q.fase]?.eje||null});
  $('volverOsem').textContent='← Volver al control de calidad';
  mostrarSolo('caja');Caja.abrir({entrada,s:segunda.s});
 }catch(err){$('resumen').textContent='No se pudo abrir la reconstrucción del equipo: '+(err.message||err);console.error(err);}
}
// Comparador: la reconstruccion de Siemens frente a la del simulador con las mismas proyecciones.
function aComparar(i){const q=estado.equipo[i];if(!q)return;mostrarSolo('cmp');Comparador.abrir(q);}
function aReorientar(){
 mostrarSolo('reo');botonesEquipo();
 Reorientar.abrir({entrada:Caja.estado.entrada,s:segunda.s,referencia:segunda.referencia,caja:Caja.caja()});
}
function aOsemDesdeCaja(){if(segunda.origen==='qc'){mostrarSolo('qc');armar();}else mostrarSolo('osem');}
// Gatillado: se reconstruye con la receta del escritorio en el rango que elige el estudiante.
function aGatillado(){
 mostrarSolo('gat');
 Gatillado.abrir({bytes:estado.gat,referencia:entradaIzquierda(),filaCorazon:estado.crudo.filaInicial,correccion:estado.correccion});
}
function aCajaDesdeReo(){if(segunda.directo){mostrarSolo('qc');armar();}else mostrarSolo('caja');}
function aReg(){OsemMovil.cancelar();$('osem').classList.add('oculta');$('reg').classList.remove('oculta');window.scrollTo(0,0);}
function aQc(){Registro.cancelar();$('reg').classList.add('oculta');$('qc').classList.remove('oculta');armar();window.scrollTo(0,0);}
$('aRegistro').addEventListener('click',aRegistro);
$('volverQc').addEventListener('click',aQc);
$('aOsem').addEventListener('click',aOsem);
$('volverReg').addEventListener('click',aReg);
$('aCaja').addEventListener('click',aCaja);
$('aGatillado').addEventListener('click',aGatillado);
$('volverOsemGat').addEventListener('click',()=>mostrarSolo('osem'));
$('aReorientar').addEventListener('click',aReorientar);
// Imagen del equipo en la reorientacion. Dos usos: compararla con la reconstruccion que el
// simulador ya hizo (sin recalcular) o reconstruir con la receta del equipo y comparar.
function botonesEquipo(texto,clase){
 const hay=EjeEquipo.disponible(),directo=!!segunda.directo,propia=segunda.origen==='osem'||directo;
 document.querySelector('#reo .otra.equipo').hidden=!propia;$('reoPropia').hidden=!hay||directo;$('reoEquipo').hidden=!hay;
 $('volverCaja').textContent=directo?'← Volver al control de calidad':'← Volver a la caja';
 const e=$('reoEquipoEstado');if(texto!==undefined){e.textContent=texto;e.className='estado'+(clase?' '+clase:'');}
 else if(!e.textContent)e.textContent=hay?'Hay una imagen del equipo cargada con la carpeta.':'';
}
async function conEquipo(f){
 const o=segunda.directo||{s:OsemMovil.estado.s,fuente:OsemMovil.estado.fuente,reg:Registro.estado},aviso=$('reoEstado');if(!o.s)return;
 for(const id of ['reoPropia','reoEquipo'])$(id).disabled=true;
 try{const x=await f(o);if(x){Reorientar.usarEquipo(x,o.s);window.scrollTo(0,0);}}
 catch(err){const detenida=EjeEquipo.estado.detenido;aviso.className=detenida?'estado':'estado error';aviso.textContent=detenida?'Reconstrucción detenida.':'No se pudo comparar con el equipo: '+(err.message||err);if(!detenida)console.error(err);window.scrollTo(0,0);}
 finally{for(const id of ['reoPropia','reoEquipo'])$(id).disabled=false;}
}
const compararPropia=()=>segunda.directo?conEquipo(recetaEquipo):conEquipo(async o=>{const en=Caja.estado.entrada;return EjeEquipo.comparar({s:o.s,volumen:Reorientar.volumen(en,o.s.n),etiqueta:en.etiqueta});});
$('reoPropia').addEventListener('click',compararPropia);
const recetaEquipo=async o=>{const fuente=o.fuente||'sin corregir',x=await EjeEquipo.ejecutar({s:o.s,reg:o.reg,fuente});if(x)x.fuente=fuente;return x;};
$('reoEquipo').addEventListener('click',()=>conEquipo(recetaEquipo));
/* Acceso directo: del control de calidad a la comparacion, sin registro, OSEM ni caja. Usa las
   proyecciones corregidas por la aplicacion si ya se corrigio. El CT entra sin desplazamiento
   (SPECT y CT comparten marco de referencia), salvo que ya haya un registro confirmado. */
async function aDirecto(){
 if(!estado.crudo||estado.ocupado)return;detener();
 const aviso=$('directoEstado'),f=estado.corr||estado.crudo,s=f.s,fuente=estado.corr?'corregidas por la aplicación':'sin corregir';
 if(!EjeEquipo.disponible()){aviso.className='estado';aviso.textContent='Falta la imagen del equipo: elige el eje corto que reconstruyó el equipo.';$('directoImagen').click();return;}
 $('aDirecto').disabled=true;aviso.className='estado';aviso.textContent='Preparando la comparación…';
 try{
  await new Promise(q=>setTimeout(q,30));
  let reg={ct:null,off:[0,0,0]};
  if(estado.ct){const r=Registro.estado;reg=r.s===s&&r.confirmado&&r.ct?r:{ct:Lab95.prepareCT(estado.ct.map(b=>Lab95.ct(dicomParser.parseDicom(b))),s),off:[0,0,0]};}
  const o={s,fuente,reg},x=await recetaEquipo(o);if(!x){aviso.textContent='';return;}
  const n=s.n,c=(n-1)/2;
  RefProy.configurar(s,(i,j,k)=>[(i-c)*s.spacing+s.origin[0],(j-c)*s.spacing+s.origin[1],s.z0-(n-1-k)*s.spacing]);
  Object.assign(segunda,{origen:'qc',s,referencia:null,directo:o});
  Registro.cancelar();OsemMovil.cancelar();mostrarSolo('reo');document.body.classList.remove('comparar');botonesEquipo();Reorientar.usarEquipo(x,s);aviso.textContent='';window.scrollTo(0,0);
 }catch(err){const detenida=EjeEquipo.estado.detenido;aviso.className=detenida?'estado':'estado error';aviso.textContent=detenida?'Reconstrucción detenida.':'No se pudo comparar: '+(err.message||err);if(!detenida)console.error(err);}
 finally{$('aDirecto').disabled=false;}
}
$('aDirecto').addEventListener('click',aDirecto);
/* Mapa polar y resultados en vivo: reconstruye la referencia (receta y eje del equipo, estres con
   atenuacion), calibra una vez y abre la seccion. */
async function aQps(){
 if(!estado.crudo||estado.ocupado)return;detener();
 const aviso=$('directoEstado'),f=estado.corr||estado.crudo,s=f.s,fuente=estado.corr?'corregidas por la aplicación':'sin corregir';
 if(!estado.ct){aviso.className='estado error';aviso.textContent='Esta sección necesita el CT del estrés: carga la carpeta con las proyecciones, el CT y el eje corto con atenuación del equipo.';return;}
 ponerTipo('ac');
 if(!EjeEquipo.disponible()){aviso.className='estado';aviso.textContent='Falta la imagen del equipo: elige el eje corto con atenuación que reconstruyó el equipo.';pendienteQps=true;$('directoImagen').click();return;}
 $('aQps').disabled=true;aviso.className='estado';aviso.textContent='Preparando la referencia…';
 try{
  await new Promise(q=>setTimeout(q,30));
  const r=Registro.estado,reg=r.s===s&&r.confirmado&&r.ct?r:{ct:Lab95.prepareCT(estado.ct.map(b=>Lab95.ct(dicomParser.parseDicom(b))),s),off:[0,0,0]};
  const x=await EjeEquipo.ejecutar({s,reg,fuente});if(!x){aviso.textContent='';return;}
  Progreso.abrir('Calibrando',null);Progreso.avance(null,'Bordes de la pared, límite normal y factores…');
  try{await Qps.abrir({s,reg,ref:x,fuente});}finally{Progreso.cerrar();}
  Registro.cancelar();OsemMovil.cancelar();mostrarSolo('qps');document.body.classList.remove('comparar');aviso.textContent='';window.scrollTo(0,0);
 }catch(err){const det=EjeEquipo.estado.detenido;aviso.className=det?'estado':'estado error';aviso.textContent=det?'Reconstrucción detenida.':'No se pudo abrir la sección: '+(err.message||err);if(!det)console.error(err);}
 finally{$('aQps').disabled=false;}
}
let pendienteQps=false;
$('aQps').addEventListener('click',aQps);
$('volverQps').addEventListener('click',()=>{mostrarSolo('qc');armar();});
// Con o sin atenuacion: un solo valor, con un selector en cada pantalla donde se usa.
const selectoresTipo=()=>document.querySelectorAll('.tipoEquipoSel');
function ponerTipo(t){EjeEquipo.fijarTipo(t);selectoresTipo().forEach(q=>{q.value=EjeEquipo.estado.tipo;});}
selectoresTipo().forEach(q=>q.addEventListener('change',()=>{
 ponerTipo(q.value);
 // En la pantalla de comparacion, el cambio se aplica de inmediato con el mismo modo.
 const x=Reorientar.estado.equipo;if(x&&!$('reo').classList.contains('oculta'))(x.modo==='receta'?conEquipo(recetaEquipo):compararPropia());
}));
$('directoImagen').addEventListener('change',async ev=>{
 const f=ev.target.files&&ev.target.files[0];ev.target.value='';if(!f)return;const aviso=$('directoEstado');
 try{aviso.className='estado';aviso.textContent='Leyendo la imagen del equipo…';await EjeEquipo.agregar(new Uint8Array(await f.arrayBuffer()));ponerTipo(EjeEquipo.estado.tipo);if(pendienteQps){pendienteQps=false;await aQps();}else await aDirecto();}
 catch(err){aviso.className='estado error';aviso.textContent=err.message||String(err);console.error(err);}
});
// Desde la pantalla inicial: cargar y seguir directo a la comparacion.
for(const id of ['directoCarpeta','directoArchivos'])$(id).addEventListener('change',async ev=>{
 const f=Array.from(ev.target.files||[]);ev.target.value='';if(!f.length)return;
 estado.crudo=null;await cargar(f);
 if(estado.crudo&&!$('qc').classList.contains('oculta'))await aDirecto();
});
$('reoArchivoEquipo').addEventListener('change',async ev=>{
 const f=ev.target.files&&ev.target.files[0];ev.target.value='';if(!f)return;
 try{botonesEquipo('Leyendo la imagen del equipo…');const q=await EjeEquipo.agregar(new Uint8Array(await f.arrayBuffer()));ponerTipo(EjeEquipo.estado.tipo);botonesEquipo(`Imagen del equipo cargada: «${q.descripcion}».`,'ok');await compararPropia();}
 catch(err){botonesEquipo(err.message||String(err),'error');console.error(err);}
});
$('volverOsem').addEventListener('click',aOsemDesdeCaja);
$('volverCaja').addEventListener('click',aCajaDesdeReo);
Progreso.iniciar();Qps.iniciar();
Registro.iniciar();
OsemMovil.iniciar();
Reorientar.iniciar();
Caja.iniciar();
Comparador.iniciar();
$('volverQcCmp').addEventListener('click',()=>{mostrarSolo('qc');armar();});
Gatillado.iniciar();
$('frame').addEventListener('input',()=>{detener();estado.k=+$('frame').value;redibujar();});
$('fila').addEventListener('input',()=>{estado.y=+$('fila').value;redibujar();});
$('play').addEventListener('click',reproducir);
// Explicaciones en dialogos: «Ver mas» abre, «Cerrar» o tocar fuera cierra.
document.querySelectorAll('[data-dialogo]').forEach(b=>b.addEventListener('click',()=>abrir(b.dataset.dialogo)));
// La ventana de progreso no se cierra tocando fuera: solo al terminar o con «Detener».
document.querySelectorAll('dialog:not(#dProgreso)').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d)d.close();});d.querySelectorAll('[data-cerrar]').forEach(b=>b.addEventListener('click',()=>d.close()));});
// Candado: cerrado, solo se desplaza la pagina (nada responde al dedo, para no mover un control
// sin querer al bajar); abierto, se manejan botones, deslizadores e imagenes y la pagina queda
// quieta (un arrastre no la mueve). Los dialogos quedan fuera: funcionan en los dos modos.
let avisoCandado=null;
function candado(cerrado,avisar){
 document.documentElement.classList.toggle('bloqueado',cerrado);document.documentElement.classList.toggle('fijo',!cerrado);
 const b=$('candado');b.setAttribute('aria-pressed',String(cerrado));b.firstElementChild.textContent=cerrado?'🔒':'🔓';
 b.setAttribute('aria-label',cerrado?'Candado cerrado: solo se desplaza la página. Toca para abrirlo y manejar botones, deslizadores e imágenes.':'Candado abierto: se manejan botones, deslizadores e imágenes y la página no se desplaza. Toca para cerrarlo y solo desplazar la página.');
 if(avisar){const a=$('candadoAviso');a.textContent=cerrado?'Candado cerrado: solo desplazar la página':'Candado abierto: manejar botones, deslizadores e imágenes';a.classList.add('visible');clearTimeout(avisoCandado);avisoCandado=setTimeout(()=>a.classList.remove('visible'),1800);}
}
$('candado').addEventListener('click',()=>candado(!document.documentElement.classList.contains('bloqueado'),true));
candado(false,false);
window.MovilCardiaco={aQps,estado,cargar,mostrar,recuperar,redibujar,armar,corregir,aRegistro,aQc,aOsem,aReg,aCaja,aReorientar,aGatillado,aEquipo,aComparar};
// Al abrir la pagina, si el telefono ya tiene el archivo guardado, se muestra sin pedir el ZIP.
recuperar();
