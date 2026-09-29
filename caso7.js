/* Recorrido del caso 7 (caso de referencia, anonimizado). Encadena lo que ya existe en la
   aplicacion en un orden fijo, con una barra de pasos:
   1. control de calidad del estres, con dos saltos simulados y la correccion automatica;
   2. registro del mapa de atenuacion, que ya viene alineado;
   3. caja y orientacion de los ejes, que parten torcidos al azar;
   4. mapa polar QPS con el eje del estudiante;
   5. caja y orientacion del gatillado;
   6. mapa polar QGS y ventriculo en 3D;
   7. pantallas finales, con el reposo procesado por la aplicacion.
   El caso se reconoce por la huella del marco de referencia de sus proyecciones de estres. */
'use strict';
const Caso7=(()=>{
 const $=id=>document.getElementById(id),dec=(x,d=0)=>Number(x).toFixed(d).replace('.',',');
 const HUELLA='22d4f455';
 const PASOS=[['qc','Control de calidad'],['reg','Registro'],['ejes','Caja y ejes'],['qps','Mapa polar'],['ejesGat','Ejes del gatillado'],['qgs','Mapa QGS'],['finales','Pantallas finales']];
 const c={activo:false,paso:0,alcanzado:0,x:null,inicial:null,inicialGat:null,fase:'estres',reco:null,fuente:''};
 const esCaso7=frame=>cardiacoHash(frame)===HUELLA;
 function entrar(activo){
  c.activo=!!activo;document.body.classList.toggle('caso7',c.activo);$('pasos7').hidden=!c.activo;
  if(!c.activo)return;c.paso=0;c.alcanzado=0;c.x=null;c.inicial=null;c.inicialGat=null;c.fase='estres';pintarPasos();
  $('titulo').textContent='SPECT cardíaco · Caso 7 · Estrés';
 }
 function pintarPasos(){
  const nav=$('pasos7');nav.replaceChildren();
  PASOS.forEach(([id,nombre],i)=>{const b=document.createElement('button');b.type='button';b.className='paso7'+(i===c.paso?' actual':'')+(i<=c.alcanzado?' hecho':'');b.disabled=i>c.alcanzado;b.textContent=`${i+1}. ${nombre}`;b.addEventListener('click',()=>ir(i));nav.append(b);});
  const act=nav.children[c.paso];if(act&&act.scrollIntoView)act.scrollIntoView({block:'nearest',inline:'center'});
 }
 function marcar(i){c.paso=i;if(i>c.alcanzado)c.alcanzado=i;pintarPasos();}
 function ir(i){
  if(i>c.alcanzado)return;const M=MovilCardiaco;
  if(i===0)M.aQc7();else if(i===1)M.aRegistro();else if(i===2&&c.x)abrirCajaEstres();else if(i===3)abrirMapa();else if(i===4&&Gatillado7.estado.suma)abrirCajaGat();else if(i===5&&Gatillado7.estado.res)M.mostrarSolo('qgs7');
  marcar(i);
 }

 /* ---------- paso 3: reconstruccion con la receta del equipo, caja y ejes torcidos ---------- */
 async function reconstruir(){
  const M=MovilCardiaco,est=M.estado,b=$('a7Reconstruir'),aviso=$('regEstado');if(!est.crudo)return;
  const f=est.corr||est.crudo,s=f.s,fuente=est.corr?'corregidas por la aplicación':'sin corregir',reg=Registro.estado;
  b.disabled=true;
  try{
   EjeEquipo.fijarTipo('ac');
   const x=await Qps.leerReferencia(s,fuente)||await EjeEquipo.ejecutar({s,reg,fuente});if(!x)return;
   if(x.completa&&!x.guardada){await guardarCompleta(s,fuente,x.completa);await Qps.guardarReferencia(s,fuente,x,null);}
   if(!x.completa)x.completa=await leerCompleta(s,fuente);
   if(!x.completa){aviso.className='estado error';aviso.textContent='Falta la reconstrucción completa: pulsa de nuevo para reconstruir.';await borrarDe(s,fuente);return;}
   c.x=x;c.s=s;c.fuente=fuente;c.reg=reg;c.inicial=null;
   const n=s.n,cc=(n-1)/2;RefProy.configurar(s,(i,j,k)=>[(i-cc)*s.spacing+s.origin[0],(j-cc)*s.spacing+s.origin[1],s.z0-(n-1-k)*s.spacing]);
   abrirCajaEstres();marcar(2);window.scrollTo(0,0);
  }catch(err){const det=EjeEquipo.estado.detenido;aviso.className=det?'estado':'estado error';aviso.textContent=det?'Reconstrucción detenida.':'No se pudo reconstruir: '+(err.message||err);if(!det)console.error(err);}
  finally{b.disabled=false;}
 }
 function abrirCajaEstres(){const n=c.s.n;c.fase='estres';MovilCardiaco.prepararCaso7({s:{n,spacing:c.s.spacing}});Caja.abrir({entrada:c.entradaEstres||(c.entradaEstres={tipo:'osem',zArriba:true,data:c.x.completa,etiqueta:'receta del equipo'}),s:{n,spacing:c.s.spacing}});$('a7Mapa').textContent='Paso 4: mapa polar con tu eje →';MovilCardiaco.mostrarSolo('caja');}
 function abrirCajaGat(){const n=c.s.n;c.fase='gat';MovilCardiaco.prepararCaso7({s:{n,spacing:c.s.spacing}});$('volverOsem').textContent='← Volver al mapa polar';Caja.abrir({entrada:c.entradaGat,s:{n,spacing:c.s.spacing}});$('a7Mapa').textContent='Paso 6: mapa QGS con tu eje →';MovilCardiaco.mostrarSolo('caja');}
 const debeTorcer=()=>c.fase==='gat'?!c.inicialGat:!c.inicial;
 function volverDesdeCaja(){if(c.fase==='gat')MovilCardiaco.mostrarSolo('qps');else MovilCardiaco.mostrarSolo('reg');}
 // paso 5: reconstruccion del gatillado con la receta del equipo
 async function gatillar(){
  const M=MovilCardiaco,b=$('a7Gatillado'),aviso=$('qpsEstado');if(!c.x)return;b.disabled=true;
  try{const suma=await Gatillado7.reconstruir({est:M.estado,s:c.s,fuente:c.fuente,centro:c.x.centro});if(!suma)return;
   c.entradaGat={tipo:'osem',zArriba:true,data:suma,etiqueta:'gatillado, suma de los 8 intervalos'};c.inicialGat=null;abrirCajaGat();marcar(4);window.scrollTo(0,0);}
  catch(err){const det=Gatillado7.estado.detenido;aviso.className=det?'estado':'estado error';aviso.textContent=det?'Reconstrucción del gatillado detenida.':'No se pudo reconstruir el gatillado: '+(err.message||err);if(!det)console.error(err);}
  finally{b.disabled=false;}
 }
 // paso 6: mapa QGS con el eje del gatillado
 async function abrirQgs(){
  const R=Reorientar.estado,marco=R.marcoFijo||CardiacoCore.marco(R.az,R.el),aviso=$('reoEstado'),b=$('a7Mapa');b.disabled=true;
  try{Progreso.abrir('Mapa QGS con tu eje',null);Progreso.avance(null,'Ocho intervalos: bordes de la pared, volúmenes y mapas…');await new Promise(r=>setTimeout(r,30));
   try{await Gatillado7.abrir({marco:{a:marco.a,u:marco.u,v:marco.v},centro:R.Cv.slice()});}finally{Progreso.cerrar();}
   MovilCardiaco.mostrarSolo('qgs7');marcar(5);window.scrollTo(0,0);}
  catch(err){aviso.className='estado error';aviso.textContent='No se pudo construir el mapa QGS: '+(err.message||err)+' Revisa que el centro esté sobre el ventrículo y endereza el eje.';console.error(err);}
  finally{b.disabled=false;}
 }
 // Al pasar de la caja a la reorientacion, el eje parte entre 8 y 15 grados fuera del eje del
 // equipo, en azimut y en elevacion, con signo al azar. Cambia cada vez que se abre.
 function torcer(){
  if(!c.activo||!c.x)return;const az=c.x.azimut,el=c.x.elevacion,g=()=>(8+Math.random()*7)*(Math.random()<.5?-1:1),da=g(),de=g(),ini={az:Math.round(az+da),el:Math.round(el+de),dAz:da,dEl:de};
  if(c.fase==='gat')c.inicialGat=ini;else c.inicial=ini;Reorientar.fijar(ini.az,ini.el);
  $('reoEstado').className='estado';$('reoEstado').textContent='El eje parte torcido. Gíralo con los deslizadores hasta que el eje corto quede circular y los ejes largos simétricos, y después sigue al mapa polar.';
 }

 /* ---------- guardado de la reconstruccion completa (sin la mascara del equipo) ---------- */
 const BD={nombre:'cardiaco-movil-caso7',tienda:'recon'};
 function bd(){return new Promise((ok,mal)=>{const r=indexedDB.open(BD.nombre,1);r.onupgradeneeded=()=>r.result.createObjectStore(BD.tienda);r.onsuccess=()=>ok(r.result);r.onerror=()=>mal(r.error);});}
 async function tienda(modo,f){const b=await bd();try{return await new Promise((ok,mal)=>{const t=b.transaction(BD.tienda,modo),r=f(t.objectStore(BD.tienda));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>mal(t.error);});}finally{b.close();}}
 const clave=(s,fuente)=>`v1|${cardiacoHash(s.frame)}|${fuente}|completa`;
 async function guardarCompleta(s,fuente,vol){try{await tienda('readwrite',t=>t.put(vol,clave(s,fuente)));}catch(err){console.warn('No se pudo guardar la reconstrucción completa',err);}}
 async function leerCompleta(s,fuente){try{const v=await tienda('readonly',t=>t.get(clave(s,fuente)));return v instanceof Float32Array?v:null;}catch(err){return null;}}
 async function borrarDe(s,fuente){try{await tienda('readwrite',t=>t.delete(clave(s,fuente)));}catch(err){}}

 /* ---------- paso 4: mapa polar con el eje del estudiante ---------- */
 async function abrirMapa(){
  if(!c.x)return;const R=Reorientar.estado,marco=R.marcoFijo||CardiacoCore.marco(R.az,R.el),aviso=$('reoEstado'),b=$('a7Mapa');
  b.disabled=true;
  try{
   Progreso.abrir('Mapa polar con tu eje',null);Progreso.avance(null,'Bordes de la pared, límite normal y resultados…');
   try{await Qps.abrirCaso7({s:c.s,reg:c.reg,ref:c.x,fuente:c.fuente,marco:{a:marco.a,u:marco.u,v:marco.v},centro:R.Cv.slice()});}finally{Progreso.cerrar();}
   MovilCardiaco.mostrarSolo('qps');marcar(3);window.scrollTo(0,0);
  }catch(err){aviso.className='estado error';aviso.textContent='No se pudo construir el mapa polar: '+(err.message||err);console.error(err);}
  finally{b.disabled=false;}
 }
 function iniciar(){
  $('a7Reconstruir').addEventListener('click',reconstruir);$('a7Mapa').addEventListener('click',()=>c.fase==='gat'?abrirQgs():abrirMapa());$('a7Gatillado').addEventListener('click',gatillar);
  $('volverQgs').addEventListener('click',()=>{Gatillado7.parar();MovilCardiaco.mostrarSolo('reo');});
  new MutationObserver(()=>{if(!c.activo)return;const v=id=>!$(id).classList.contains('oculta');if(v('qc'))marcar(0);else if(v('reg'))marcar(1);else if(v('caja')||v('reo'))marcar(c.fase==='gat'?4:2);else if(v('qps'))marcar(3);else if(v('qgs7'))marcar(5);const vq=v('qgs7');if(c.vioQgs&&!vq)Gatillado7.parar();c.vioQgs=vq;}).observe(document.querySelector('main'),{subtree:true,attributes:true,attributeFilter:['class']});
 }
 return {iniciar,entrar,esCaso7,torcer,debeTorcer,volverDesdeCaja,guardarCompleta,estado:c,get activo(){return c.activo;}};
})();
window.Caso7=Caso7;
