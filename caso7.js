/* Recorrido del caso 7 (caso de referencia, anonimizado). Encadena lo que ya existe en la
   aplicacion en un orden fijo, con una barra de pasos:
   A. Estres: 1. control de calidad, con dos saltos simulados y la correccion automatica;
      2. registro del mapa de atenuacion, que ya viene alineado; 3. reconstruccion con la receta
      del equipo, caja y orientacion de los ejes, que parten en 0° y 0° para que el estudiante los
      corrija; 4. reconstruccion
      del gatillado, caja y orientacion de sus ejes.
   B. Reposo: los mismos cuatro pasos con las proyecciones, el CT y la gatillada del reposo.
   Despues: pantallas finales generadas con los ejes del estudiante, con y sin atenuacion (la
   reconstruccion sin atenuacion de cada fase se hace ahi, con la receta del equipo); mapa polar con
   menus de fase y de atenuacion, y mapa QGS con menu de fase.
   Cada fase guarda lo suyo (reconstruccion, registro, ejes, correccion) para poder volver a ella.
   El caso se reconoce por la huella del marco de referencia de sus proyecciones de estres. */
'use strict';
const Caso7=(()=>{
 const $=id=>document.getElementById(id);
 const NOMBRE={estres:'Estrés',reposo:'Reposo'},MINUS={estres:'estrés',reposo:'reposo'};
 // Casos del recorrido, por la huella del marco de referencia de sus proyecciones de estres.
 const CASOS={
  '22d4f455':{num:7,reposo:'474e44e4',notaReposo:true,antecedentes:null},
  'b13ef109':{num:8,reposo:'a17066aa',notaReposo:false,antecedentes:'Hombre de 84 años con tumor maligno de la cabeza del páncreas. SPECT de perfusión miocárdica con 99mTc-MIBI, estrés y reposo en días distintos, con 25,6 mCi en cada fase; estrés farmacológico con adenosina endovenosa. ECG de reposo en ritmo sinusal, con bloqueo completo de rama derecha y extrasístoles ventriculares aisladas. En el estrés la frecuencia máxima fue de 76 lpm (56 % de la predicha para la edad, 135 lpm) y la presión, 145/90 mmHg, sin cambios en el ECG y sin síntomas. Gatillado en las dos fases y CT de baja dosis para corregir la atenuación.',resumen:'paciente con tumor de páncreas, estrés farmacológico con adenosina en días distintos, bloqueo de rama derecha y extrasístoles',
   gatillado:'OSEM 4 × 4, gaussiano 8,4 mm, la misma del caso 7: este caso no trae el gatillado reconstruido por el equipo'}};
 const PASOS=[
  {fase:'estres',id:'qc',n:'Control de calidad'},{fase:'estres',id:'reg',n:'Registro'},{fase:'estres',id:'ejes',n:'Caja y ejes'},{fase:'estres',id:'ejesGat',n:'Ejes del gatillado'},
  {fase:'reposo',id:'qc',n:'Control de calidad'},{fase:'reposo',id:'reg',n:'Registro'},{fase:'reposo',id:'ejes',n:'Caja y ejes'},{fase:'reposo',id:'ejesGat',n:'Ejes del gatillado'},
  {id:'pantallas',n:'Pantallas finales'},{id:'mapa',n:'Mapa polar'},{id:'qgs',n:'Mapa QGS'}];
 const I={pantallas:8,mapa:9,qgs:10};
 // Receta con que el equipo reconstruyo cada fase (leida de sus DICOM de eje corto con atenuacion).
 const RECETA={estres:'OSEM 6 × 4 con corrección de atenuación y de dispersión, filtro gaussiano de 9 mm',reposo:'OSEM 6 × 4 con corrección de atenuación, filtro gaussiano de 9 mm'};
 const nueva=()=>({vivo:{estatico:null,gat:null},x:null,xNoAC:null,xNoACfuente:'',s:null,fuente:'',reg:null,inicial:null,inicialGat:null,entradaEstatica:null,entradaGat:null,ejes:null,ejesGat:null,gatBytes:null,correccion:null,estado:null,restaurar:false,restaurarGat:false});
 const c={activo:false,paso:0,alcanzado:0,fase:'estres',sub:'estatico',F:{estres:nueva(),reposo:nueva()},vista:{mapa:'estres',tipo:'ac',qgs:'estres'},ocupado:false};
 const F=()=>c.F[c.fase],base=()=>c.fase==='reposo'?4:0;
 // Compatibilidad: lo de la fase activa se lee como antes (Caso7.estado.x, .s, .fuente, .reg).
 for(const k of ['x','s','fuente','reg'])Object.defineProperty(c,k,{get:()=>F()[k],enumerable:false});
 const esCaso7=frame=>CASOS[cardiacoHash(frame)]||null;

 const nombreCaso=()=>'Caso '+(c.caso?c.caso.num:'');
 function titulo(texto){$('titulo').textContent=`SPECT cardíaco · ${nombreCaso()} · `+(texto||NOMBRE[c.fase]);}
 // Antecedentes clinicos del caso, visibles desde el inicio (control de calidad y pantallas finales).
 function antecedentes(){const a=c.caso&&c.caso.antecedentes;document.querySelectorAll('.antecedentes7').forEach(e=>{e.hidden=!a;const p=e.querySelector('.antecedentes7Texto');if(p)p.textContent=a||'';});}
 // fase: al cambiar de fase dentro del recorrido no se borra lo hecho.
 function entrar(activo,fase){
  if(fase&&c.activo){c.fase=fase;c.sub='estatico';titulo();receta();pintarPasos();return;}
  c.activo=!!activo;c.caso=activo&&typeof activo==='object'?activo:null;document.body.classList.toggle('caso7',c.activo);$('pasos7').hidden=!c.activo;
  if(!c.activo){if(window.Tutorial7&&Tutorial7.estado.activo)Tutorial7.cerrar();antecedentes();return;}
  setTimeout(()=>{if(c.activo&&window.Tutorial7)Tutorial7.ofrecer();},500);Object.assign(c,{paso:0,alcanzado:0,fase:'estres',sub:'estatico',F:{estres:nueva(),reposo:nueva()},vista:{mapa:'estres',tipo:'ac',qgs:'estres'}});
  if(window.Pantallas7)Pantallas7.olvidar();titulo();receta();antecedentes();pintarPasos();
 }
 function receta(){const p=$('a7Receta');if(p)p.textContent=`Receta del equipo para el ${MINUS[c.fase]}: ${RECETA[c.fase]}. Se reconstruye sobre las proyecciones que dejaste en el control de calidad, corregidas o no.`;}
 function pintarPasos(){
  const nav=$('pasos7');nav.replaceChildren();let grupo=null;
  PASOS.forEach((P,i)=>{
   const g=P.fase?NOMBRE[P.fase]:'';if(g&&g!==grupo){const e=document.createElement('span');e.className='grupo7';e.textContent=(P.fase==='estres'?'A. ':'B. ')+g;nav.append(e);}grupo=g;
   if(!P.fase&&i===I.pantallas){const e=document.createElement('span');e.className='grupo7';e.textContent='Resultados';nav.append(e);}
   const b=document.createElement('button');b.type='button';b.className='paso7'+(i===c.paso?' actual':'')+(i<=c.alcanzado?' hecho':'');b.disabled=i>c.alcanzado||c.ocupado;
   b.textContent=P.fase?`${i%4+1}. ${P.n}`:P.n;b.dataset.i=i;b.addEventListener('click',()=>ir(i));nav.append(b);});
  const act=nav.querySelector('.paso7.actual');if(act&&act.scrollIntoView)act.scrollIntoView({block:'nearest',inline:'center'});
 }
 function marcar(i){c.paso=i;if(i>c.alcanzado)c.alcanzado=i;pintarPasos();}
 async function conBloqueo(f){if(c.ocupado)return;c.ocupado=true;pintarPasos();try{return await f();}finally{c.ocupado=false;pintarPasos();}}
 function ir(i){
  if(i>c.alcanzado||c.ocupado)return;const P=PASOS[i];
  return conBloqueo(async()=>{
   if(P.fase&&P.fase!==c.fase)await cambiarFase(P.fase);
   const M=MovilCardiaco,Fx=F();
   if(P.id==='qc')M.aQc7();else if(P.id==='reg')await M.aRegistro();
   else if(P.id==='ejes'){if(!Fx.x)return;Fx.restaurar=true;abrirCajaEstatica();}
   else if(P.id==='ejesGat'){if(!Fx.entradaGat)return;Fx.restaurarGat=true;abrirCajaGat();}
   else if(P.id==='pantallas'){await abrirPantallas(false);return;}
   else if(P.id==='mapa'){await abrirMapa(c.vista.mapa,c.vista.tipo);return;}
   else if(P.id==='qgs'){await abrirQgs(c.vista.qgs);return;}
   marcar(i);
  });
 }

 /* ---------- cambio de fase ---------- */
 function guardarFase(){const e=MovilCardiaco.estado;F().estado={corr:e.corr,correccion:e.correccion,modo:e.modo,comparacion:e.comparacion};}
 async function cambiarFase(fase){
  guardarFase();const Fx=c.F[fase];
  if(!await MovilCardiaco.cargarFase(fase,Fx.estado))throw Error('No se pudo abrir el '+MINUS[fase]+' del ZIP.');
  Fx.restaurar=true;Fx.restaurarGat=true;
 }
 async function aReposo(){guardarFase();if(!await MovilCardiaco.cargarFase('reposo',c.F.reposo.estado))return;marcar(4);}

 /* ---------- paso 3: reconstruccion con la receta del equipo, caja y ejes desde 0° y 0° ---------- */
 async function reconstruir(){
  const M=MovilCardiaco,est=M.estado,b=$('a7Reconstruir'),aviso=$('regEstado');if(!est.crudo||c.ocupado)return;
  const f=est.corr||est.crudo,s=f.s,fuente=est.corr?'corregidas por la aplicación':'sin corregir',r=Registro.estado;
  // El registro se guarda por fase: al cambiar de fase el modulo del registro empieza de nuevo.
  const reg={ct:r.ct,off:r.off.slice(),s:r.s,ctBytes:r.ctBytes,confirmado:r.confirmado};
  b.disabled=true;c.ocupado=true;pintarPasos();
  try{
   EjeEquipo.fijarTipo('ac');
   // El boton del paso 3 siempre reconstruye con la receta del equipo. Lo guardado solo se usa al
   // volver a este paso desde la barra y en el mapa polar.
   const x=await EjeEquipo.ejecutar({s,reg,fuente,forzar:true});if(!x)return;
   const Fx=F(),mismo=Fx.x&&Fx.s===s&&Fx.fuente===fuente;
   Object.assign(Fx,{x,s,fuente,reg,entradaEstatica:null});
   // Con las mismas proyecciones la reconstruccion es la misma: se recupera el eje que ya habia dejado.
   if(!mismo)Object.assign(Fx,{vivo:{estatico:null,gat:null},xNoAC:null,inicial:null,ejes:null,entradaGat:null,ejesGat:null,inicialGat:null,restaurar:false,restaurarGat:false});
   else Fx.restaurar=true;
   abrirCajaEstatica();marcar(base()+2);
  }catch(err){const det=EjeEquipo.estado.detenido;aviso.className=det?'estado':'estado error';aviso.textContent=det?'Reconstrucción detenida.':'No se pudo reconstruir: '+(err.message||err);if(!det)console.error(err);}
  finally{b.disabled=false;c.ocupado=false;pintarPasos();}
 }
 function configurarRef(s){const n=s.n,cc=(n-1)/2;RefProy.configurar(s,(i,j,k)=>[(i-cc)*s.spacing+s.origin[0],(j-cc)*s.spacing+s.origin[1],s.z0-(n-1-k)*s.spacing]);}
 function abrirCajaEstatica(){
  const Fx=F(),s=Fx.s,n=s.n;c.sub='estatico';configurarRef(s);MovilCardiaco.prepararCaso7({s:{n,spacing:s.spacing}});
  Caja.abrir({entrada:Fx.entradaEstatica||(Fx.entradaEstatica={tipo:'osem',zArriba:true,data:Fx.x.completa,etiqueta:'receta del equipo'}),s:{n,spacing:s.spacing}});
  const nota=$('a7NotaReposo');if(nota)nota.hidden=c.fase!=='reposo'||!(c.caso&&c.caso.notaReposo);
  botonSiguiente();MovilCardiaco.mostrarSolo('caja');
 }
 function abrirCajaGat(){
  const Fx=F(),s=Fx.s,n=s.n;c.sub='gat';configurarRef(s);MovilCardiaco.prepararCaso7({s:{n,spacing:s.spacing}});$('volverOsem').textContent=`← Volver a los ejes del ${MINUS[c.fase]}`;
  const nota=$('a7NotaReposo');if(nota)nota.hidden=true;
  Caja.abrir({entrada:Fx.entradaGat,s:{n,spacing:s.spacing}});botonSiguiente();MovilCardiaco.mostrarSolo('caja');
 }
 function botonSiguiente(){
  $('a7Mapa').textContent=c.sub==='estatico'?`Paso 4: reconstruir el gatillado del ${MINUS[c.fase]} y orientar sus ejes →`:c.fase==='estres'?'Siguiente: reposo, control de calidad →':'Siguiente: generar las pantallas finales →';
  const p=$('a7GatReceta');if(p)p.hidden=c.sub!=='estatico';
 }
 const debeTorcer=()=>c.sub==='gat'?!F().inicialGat:!F().inicial;
 function volverDesdeCaja(){if(c.sub==='gat'){F().restaurar=true;abrirCajaEstatica();marcar(base()+2);}else MovilCardiaco.aRegistro();}
 // Eje vivo: cada vez que la reorientacion se repinta, se anota el eje del estudiante en la fase y
 // el paso a que pertenece esa reconstruccion (estatico o gatillado).
 function anotarVivo(){
  if(!c.activo||c.silencio)return;const R=Reorientar.estado;
  for(const f of ['estres','reposo']){const Fx=c.F[f],k=R.origen&&R.origen===Fx.entradaEstatica?'estatico':R.origen&&R.origen===Fx.entradaGat?'gat':null;if(k){Fx.vivo[k]={az:R.az,el:R.el,Cv:R.Cv.slice(),t:R.t};return;}}
 }
 // Al abrir la reorientacion. reinicio: la reorientacion recibio otra reconstruccion y dejo el eje en
 // 0° y 0°. Entonces se repone el ultimo eje del estudiante en ese paso o, si es la primera vez, el
 // eje parte en 0° y 0°. Si no hubo reinicio, el eje sigue donde el estudiante lo dejo.
 // Mientras la reorientacion se abre (y quizas vuelve a 0° y 0°) no se anota nada.
 function antesDeReo(){c.silencio=true;}
 function alAbrirReo(reinicio){
  c.silencio=false;const Fx=F(),k=c.sub==='gat'?'gat':'estatico',v=Fx.vivo[k];
  if(reinicio){
   if(v){const R=Reorientar.estado;R.Cv=v.Cv.slice();R.t=v.t||0;Reorientar.fijar(v.az,v.el);$('reoEstado').className='estado ok';$('reoEstado').textContent=`Recuperado el eje que dejaste en este paso: azimut ${v.az}°, elevación ${v.el}°. Puedes seguir ajustándolo.`;}
   else partirEnCero();
  }else anotarVivo();
  botonSiguiente();
 }
 function guardarEjes(){
  const R=Reorientar.estado,m=R.marcoFijo||CardiacoCore.marco(R.az,R.el);
  F()[c.sub==='gat'?'ejesGat':'ejes']={az:R.az,el:R.el,Cv:R.Cv.slice(),t:R.t,marco:{a:m.a.slice(),u:m.u.slice(),v:m.v.slice()}};
 }
 async function siguiente(){
  if(c.ocupado)return;const b=$('a7Mapa');b.disabled=true;
  try{
   if(c.sub==='estatico'){guardarEjes();await conBloqueo(gatillar);}
   else{guardarEjes();if(c.fase==='estres')await conBloqueo(aReposo);else await conBloqueo(()=>abrirPantallas(true));}
  }finally{b.disabled=false;}
 }
 // paso 4: reconstruccion del gatillado con la receta del equipo
 async function gatillar(){
  const M=MovilCardiaco,Fx=F(),aviso=$('reoEstado');if(!Fx.x)return;
  const mismo=!!Fx.entradaGat&&Fx.gatFuente===Fx.fuente;
  try{const suma=await Gatillado7.reconstruir({est:{gat:M.estado.gat,correccion:M.estado.correccion},s:Fx.s,fuente:Fx.fuente,centro:Fx.x.centro,forzar:true});if(!suma)return;
   Object.assign(Fx,{entradaGat:{tipo:'osem',zArriba:true,data:suma,etiqueta:`gatillado del ${MINUS[c.fase]}, suma de los 8 intervalos`},gatFuente:Fx.fuente,gatBytes:M.estado.gat,correccion:M.estado.correccion});
   if(mismo)Fx.restaurarGat=true;else{Object.assign(Fx,{inicialGat:null,ejesGat:null});Fx.vivo.gat=null;}
   abrirCajaGat();marcar(base()+3);}
  catch(err){const det=Gatillado7.estado.detenido;aviso.className=det?'estado':'estado error';aviso.textContent=det?'Reconstrucción del gatillado detenida.':'No se pudo reconstruir el gatillado: '+(err.message||err);if(!det)console.error(err);}
 }
 // La primera vez que se orienta cada paso (estatico y gatillado, en cada fase) el eje parte en 0°
 // de azimut y 0° de elevacion, como en el equipo antes de reorientar: el estudiante lo corrige.
 function partirEnCero(){
  const Fx=F();if(!c.activo||!Fx.x)return;const ini={az:0,el:0};
  if(c.sub==='gat')Fx.inicialGat=ini;else Fx.inicial=ini;Reorientar.fijar(0,0);
  $('reoEstado').className='estado';$('reoEstado').textContent='El eje parte en 0° de azimut y 0° de elevación. Gíralo con los deslizadores hasta que el eje corto quede circular y los ejes largos simétricos, y después sigue.';
 }

 /* ---------- resultados: pantallas finales, mapa polar y mapa QGS, con menu estres / reposo ---------- */
 const listo=f=>!!(c.F[f].x&&c.F[f].ejes),listoGat=f=>!!(c.F[f].entradaGat&&c.F[f].ejesGat);
 function datosMapa(f,tipo){const Fx=c.F[f];return {s:Fx.s,reg:Fx.reg,ref:tipo==='noac'?Fx.xNoAC:Fx.x,fuente:Fx.fuente,marco:Fx.ejes.marco,centro:Fx.ejes.Cv.slice(),fase:f,tipo:tipo||'ac'};}
 // Reconstruccion sin atenuacion de una fase, con la receta del equipo para su eje corto sin
 // atenuacion (EjeEquipo elige ese DICOM por el marco de referencia y el tipo). Se usa tus ejes.
 async function reconstruirNoAC(f){
  const Fx=c.F[f];if(Fx.xNoAC&&Fx.xNoACfuente===Fx.fuente)return Fx.xNoAC;
  EjeEquipo.fijarTipo('noac');
  try{const x=await EjeEquipo.ejecutar({s:Fx.s,reg:Fx.reg,fuente:Fx.fuente});if(!x)throw Error('se detuvo la reconstrucción sin atenuación del '+MINUS[f]);Fx.xNoAC=x;Fx.xNoACfuente=Fx.fuente;return x;}
  finally{EjeEquipo.fijarTipo('ac');}
 }
 async function cargarGat(f){const Fx=c.F[f];return Gatillado7.reconstruir({est:{gat:Fx.gatBytes,correccion:Fx.correccion},s:Fx.s,fuente:Fx.fuente,centro:Fx.x.centro});}
 function menu(id,f){document.querySelectorAll(`#${id} [data-fase7]`).forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.fase7===f));b.disabled=!(id==='qgsFase'?listoGat(b.dataset.fase7):listo(b.dataset.fase7));});}
 function menuTipo(tipo){document.querySelectorAll('#qpsTipo [data-tipo7]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tipo7===tipo)));}
 async function abrirMapa(f,tipo){
  if(!listo(f))return;tipo=tipo||c.vista.tipo;const aviso=$('qpsEstado'),con=tipo==='noac'?'sin atenuación':'con atenuación';c.vista.mapa=f;c.vista.tipo=tipo;titulo(`Mapa polar · ${NOMBRE[f]} ${con}`);
  try{
   if(tipo==='noac')await reconstruirNoAC(f);
   Progreso.abrir(`Mapa polar del ${MINUS[f]} ${con}, con tu eje`,null);Progreso.avance(null,'Bordes de la pared, límite normal y resultados…');
   try{await Qps.abrirCaso7(datosMapa(f,tipo));}finally{Progreso.cerrar();}
   // La receta en vivo reconstruye con el tipo que se esta viendo (mascara y escala del equipo).
   EjeEquipo.fijarTipo(tipo);
   const t=document.querySelector('#qps .columna');if(t)t.textContent=`Mapa polar y resultados · ${MINUS[f]} ${con}`;
   menu('qpsFase',f);menuTipo(tipo);MovilCardiaco.mostrarSolo('qps');marcar(I.mapa);
  }catch(err){aviso.className='estado error';aviso.textContent='No se pudo construir el mapa polar: '+(err.message||err);console.error(err);}
 }
 async function abrirQgs(f){
  if(!listoGat(f))return;const Fx=c.F[f],aviso=$('qgsEstado');c.vista.qgs=f;titulo('Mapa QGS · '+NOMBRE[f]);
  try{
   if(!await cargarGat(f))return;
   Progreso.abrir(`Mapa QGS del ${MINUS[f]} con tu eje`,null);Progreso.avance(null,'Ocho intervalos: bordes de la pared, volúmenes y mapas…');await new Promise(r=>setTimeout(r,30));
   try{await Gatillado7.abrir({marco:Fx.ejesGat.marco,centro:Fx.ejesGat.Cv.slice(),fase:f});}finally{Progreso.cerrar();}
   const t=document.querySelector('#qgs7 .columna');if(t)t.textContent=`Mapa QGS · ${MINUS[f]} gatillado`;
   menu('qgsFase',f);MovilCardiaco.mostrarSolo('qgs7');marcar(I.qgs);
  }catch(err){aviso.className='estado error';aviso.textContent='No se pudo construir el mapa QGS: '+(err.message||err)+' Revisa que el centro esté sobre el ventrículo y endereza el eje.';console.error(err);}
 }
 // Pantallas finales: se calculan con los ejes del estudiante en las dos fases (pantallas7.js).
 async function abrirPantallas(generar){
  if(!['estres','reposo'].every(f=>listo(f)&&listoGat(f))){$('reoEstado').className='estado error';$('reoEstado').textContent='Faltan pasos: para las pantallas finales hay que orientar los ejes del estrés y del reposo, estáticos y gatillados.';return;}
  titulo('Pantallas finales');MovilCardiaco.mostrarSolo('pantallas7');marcar(I.pantallas);
  if(!generar&&Pantallas7.hechas())return;
  const aviso=$('pantEstado');
  try{for(const f of ['estres','reposo']){aviso.className='estado';aviso.textContent=`Reconstruyendo el ${MINUS[f]} sin atenuación con la receta del equipo…`;await reconstruirNoAC(f);}}
  catch(err){const det=EjeEquipo.estado.detenido;aviso.className=det?'estado':'estado error';aviso.textContent=det?'Reconstrucción sin atenuación detenida. Pulsa «Volver a generar» para seguir.':'No se pudo reconstruir sin atenuación: '+(err.message||err);if(!det)console.error(err);return;}
  await Pantallas7.generar({fases:['estres','reposo'].map(f=>({fase:f,nombre:NOMBRE[f],mapa:datosMapa(f,'ac'),mapaNoAC:datosMapa(f,'noac'),gat:{marco:c.F[f].ejesGat.marco,centro:c.F[f].ejesGat.Cv.slice()},cargarGat:()=>cargarGat(f)}))});
 }

 function iniciar(){
  Reorientar.estado.alCambiar=anotarVivo;
  $('a7Reconstruir').addEventListener('click',reconstruir);$('a7Mapa').addEventListener('click',siguiente);
  $('a7Qgs').addEventListener('click',()=>conBloqueo(()=>abrirQgs(c.vista.qgs)));$('a7MapaDesdePantallas').addEventListener('click',()=>conBloqueo(()=>abrirMapa(c.vista.mapa,c.vista.tipo)));
  $('pantRegenerar').addEventListener('click',()=>conBloqueo(()=>abrirPantallas(true)));
  $('volverQgs').addEventListener('click',()=>{Gatillado7.parar();conBloqueo(()=>abrirMapa(c.vista.mapa,c.vista.tipo));});
  document.querySelectorAll('#qpsFase [data-fase7]').forEach(b=>b.addEventListener('click',()=>conBloqueo(()=>abrirMapa(b.dataset.fase7,c.vista.tipo))));
  document.querySelectorAll('#qpsTipo [data-tipo7]').forEach(b=>b.addEventListener('click',()=>conBloqueo(()=>abrirMapa(c.vista.mapa,b.dataset.tipo7))));
  document.querySelectorAll('#qgsFase [data-fase7]').forEach(b=>b.addEventListener('click',()=>conBloqueo(()=>abrirQgs(b.dataset.fase7))));
  new MutationObserver(()=>{if(!c.activo)return;const v=id=>!$(id).classList.contains('oculta');
   if(v('qc'))marcar(base());else if(v('reg'))marcar(base()+1);else if(v('caja')||v('reo'))marcar(base()+(c.sub==='gat'?3:2));else if(v('pantallas7'))marcar(I.pantallas);else if(v('qps'))marcar(I.mapa);else if(v('qgs7'))marcar(I.qgs);
   const vq=v('qgs7');if(c.vioQgs&&!vq)Gatillado7.parar();c.vioQgs=vq;}).observe(document.querySelector('main'),{subtree:true,attributes:true,attributeFilter:['class']});
 }
 // Paso 2: el registro parte con la configuracion elegida por el docente (en las dos fases).
 const REGISTRO={plano:'axial',corte:{axial:42},mezcla:.5,nivel:.51,ancho:.82,ventana:'blando'};
 function volverDesdeMapa(){conBloqueo(()=>abrirPantallas(false));}
 return {REGISTRO,iniciar,entrar,esCaso7,partirEnCero,debeTorcer,antesDeReo,alAbrirReo,volverDesdeCaja,volverDesdeMapa,estado:c,CASOS,get activo(){return c.activo;},get fase(){return c.fase;},get caso(){return c.caso;},get nombre(){return nombreCaso();}};
})();
window.Caso7=Caso7;
