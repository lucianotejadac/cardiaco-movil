/* Tutorial paso a paso del caso 7: una ventana flotante que se arrastra por su barra, una flecha
   que apunta al control del paso y un marco que lo resalta. Sigue al estudiante: al pasar a otra
   seccion del recorrido muestra los pasos de esa seccion, y algunos pasos avanzan solos cuando el
   estudiante hace lo que se le pide (corregir, confirmar, ver el resultado del equipo). */
'use strict';
const Tutorial7=(()=>{
 const $=id=>document.getElementById(id);
 const est=()=>window.Caso7?Caso7.estado:{},gat=()=>est().sub==='gat',fase=()=>est().fase==='reposo'?'reposo':'estrés';
 const visible=el=>!!el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
 // Pasos por seccion. o: selector del objetivo. t: texto. si: el paso se muestra solo si se cumple.
 // hasta: el paso avanza solo cuando se cumple. espera: lo que se muestra mientras tanto.
 const PASOS={
  qc:[
   {o:'#pasos7',t:'Este es el recorrido del caso 7. Arriba están los pasos: A. Estrés, B. Reposo y, al final, los resultados. Puedes volver a cualquier paso ya hecho tocándolo.'},
   {o:'.saberMas',t:'En cada paso, «Saber más» explica las siglas, las unidades y los conceptos que se ven en ese momento en la pantalla.'},
   {o:'#rejilla',t:()=>`Control de calidad de las proyecciones del ${fase()}. El cine muestra el giro de la cámara y el sinograma, una fila a lo largo de todas las vistas. Un salto del paciente se ve como un corte brusco en la sinusoide del sinograma y como un escalón en el linograma.`},
   {o:'#qc .controles',t:'«Vista» recorre el cine y «Fila» elige qué fila muestra el sinograma. También puedes tocar las imágenes.'},
   {o:'#modo',si:()=>!MovilCardiaco.estado.corr,t:'Pulsa «Corregir»: la aplicación busca los saltos y los corrige. Después verás dos columnas, sin corregir y corregido.',hasta:()=>!!MovilCardiaco.estado.corr,espera:'Esperando que pulses «Corregir»…'},
   {o:'#resumen',t:'Aquí se informa qué saltos encontró la aplicación y desde qué paso del giro. Compara el sinograma sin corregir con el corregido.'},
   {o:'#aRegistro',t:'Cuando estés conforme, sigue al registro con el CT.'}],
  reg:[
   {o:'#regFusion',t:'La emisión, en color, sobre el CT, en gris. El CT se usa para corregir la atenuación, así que tiene que calzar con el corazón. Arrastra sobre la imagen para mover el CT.'},
   {o:'#reg .segmento',t:'Revisa los tres planos: axial, coronal y sagital. Mira la piel del tórax y el borde del corazón.'},
   {o:'#reg .controles',t:'«Corte» recorre los cortes, «SPECT» cambia la mezcla, nivel y ancho ajustan la ventana de la emisión, y el menú elige la ventana del CT. Las flechas mueven el CT de a 1 mm.'},
   {o:'#regConfirmar',si:()=>!Registro.estado.confirmado,t:'Cuando calce, pulsa «Confirmar registro».',hasta:()=>!!Registro.estado.confirmado,espera:'Esperando que confirmes el registro…'},
   {o:'#a7Reconstruir',t:'Ahora reconstruye con la receta del equipo. Toma cerca de un minuto en un computador, y más en una tablet.'}],
  caja:[
   {o:'#cajaCoronal',t:()=>gat()?`La suma de los 8 intervalos del gatillado del ${fase()}. Lleva la caja al corazón en el coronal y en el sagital.`:'La reconstrucción con la receta del equipo. Lleva la caja al corazón en el coronal y en el sagital: arrastra dentro para moverla y desde una esquina para cambiar su tamaño.'},
   {o:'#a7NotaReposo',si:()=>visible($('a7NotaReposo')),t:'En el reposo hay actividad intestinal bajo el corazón. Es la que hizo fallar la máscara del equipo en el reposo con atenuación.'},
   {o:'#caja .refProy',si:()=>visible(document.querySelector('#caja .refProy')),t:'Abajo, dos proyecciones con la caja proyectada: el punto amarillo tiene que caer sobre el corazón.'},
   {o:'#aReorientar',t:'Con la caja sobre el ventrículo, sigue a la orientación de los ejes.'}],
  reo:[
   {o:'#reoAxial',t:'El eje parte en 0° de azimut y 0° de elevación, y tú lo corriges. La línea celeste es el eje, con el punto en el ápex, y el punto amarillo es el centro del ventrículo: arrástralo sobre cualquier imagen.'},
   {o:'#reo .controles',t:'Gira el azimut hasta que el eje pase por el ápex en el transaxial, y la elevación hasta que lo haga en el plano vertical.'},
   {o:'#reoCorto',t:'Revisa los cortes: el eje corto tiene que quedar como un anillo parejo, el largo vertical como una «C» y el largo horizontal como una «U» invertida.'},
   {o:'#a7Mapa',t:()=>`Cuando estés conforme, sigue: «${($('a7Mapa').textContent||'').replace(/\s*→\s*$/,'')}».`}],
  pantallas7:[
   {o:'#pantMenu',t:'Seis pantallas generadas con tus ejes, con la misma disposición que las del equipo: sin y con atenuación, y el QGS de cada fase.'},
   {o:'#pantLienzo',t:'Toca la pantalla para verla ampliada. Con «Descargar» la guardas en PNG.'},
   {o:'#pantMascara',si:()=>visible($('pantMascara')),t:'En las pantallas con atenuación, el reposo trae la falla de máscara del equipo. Este botón la explica.'},
   {o:'#a7MapaDesdePantallas',t:'Después, revisa el mapa polar en detalle.'}],
  qps:[
   {o:'#qpsFase',t:'Elige la fase y, debajo, si ves la reconstrucción con o sin atenuación.'},
   {o:'#qpsAviso',si:()=>visible($('qpsAviso')),t:'Este estudio trae una falla de máscara del equipo. Lee el aviso y toca «Ver más» para la explicación completa.'},
   {o:'#qps .controles.fijo',t:'Tu eje, a la vista. Los deslizadores lo giran desde el que dejaste y todo se recalcula al momento.'},
   {o:'#qpsTabla',t:'Tus resultados: volumen, pared, cuentas, defecto, extensión, TPD, forma y puntajes.'},
   {o:'#qpsRevelar',si:()=>!Qps.estado.revelar,t:'Pulsa «Ver el resultado del equipo» para comparar par a par: tus números junto a los del equipo, y tu mapa junto al suyo.',hasta:()=>!!Qps.estado.revelar,espera:'Esperando que pulses «Ver el resultado del equipo»…'},
   {o:'#qpsMapas',t:'A la izquierda tu mapa; a la derecha el del equipo. En negro, lo que queda bajo el límite normal.'},
   {o:'#a7Qgs',t:'Sigue al mapa QGS.'}],
  qgs7:[
   {o:'#qgsFase',t:'Elige la fase del gatillado.'},
   {o:'#qgs3d',t:'El ventrículo en 3D late con los 8 intervalos: en gris la superficie interna, en naranja la externa en fin de diástole. Arrástralo para girarlo.'},
   {o:'#qgsTabla',t:'Volúmenes, fracción de eyección, forma y llenado del ventrículo.'},
   {o:'#qgsRevelar',si:()=>!Gatillado7.estado.revelar,t:'Pulsa «Ver el resultado del equipo» para comparar par a par.',hasta:()=>!!Gatillado7.estado.revelar,espera:'Esperando que pulses «Ver el resultado del equipo»…'},
   {o:'#qgsMapas',t:'Cada mapa tuyo junto al del equipo: perfusión en fin de diástole y de sístole, movimiento y engrosamiento.'},
   {o:'#qgsCurvas',t:'Tu curva de volumen junto a la del equipo. Con esto termina el recorrido.'}]};
 const NOMBRE={qc:'Control de calidad',reg:'Registro',caja:'Caja',reo:'Orientación de los ejes',pantallas7:'Pantallas finales',qps:'Mapa polar',qgs7:'Mapa QGS'};
 const t={activo:false,sec:null,i:0,movido:false,fin:false,raf:0,objetivo:null};
 let V,F,L,M;
 function crear(){
  V=document.createElement('div');V.id='tut';V.className='tut';V.setAttribute('role','dialog');V.setAttribute('aria-label','Tutorial');V.hidden=true;
  V.innerHTML='<div class="tutBarra"><span class="tutAsa" aria-hidden="true">⠿</span><b id="tutTitulo">Tutorial</b><span id="tutCuenta"></span><button id="tutCerrar" type="button" aria-label="Cerrar el tutorial">✕</button></div><p id="tutTexto"></p><p id="tutEspera" class="tutEspera" hidden></p><div class="tutBotones"><button id="tutAnt" type="button">← Anterior</button><button id="tutSig" type="button">Siguiente →</button></div>';
  F=document.createElementNS('http://www.w3.org/2000/svg','svg');F.id='tutFlecha';F.setAttribute('class','tutFlecha');F.setAttribute('aria-hidden','true');
  F.innerHTML='<defs><marker id="tutPunta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ffb347"/></marker></defs><path id="tutSombra" fill="none" stroke="rgba(0,0,0,.65)" stroke-width="7" stroke-linecap="round"/><path id="tutLinea" fill="none" stroke="#ffb347" stroke-width="3.5" stroke-linecap="round" marker-end="url(#tutPunta)"/>';
  M=document.createElement('div');M.id='tutMarco';M.className='tutMarco';M.hidden=true;
  document.body.append(F,M,V);L=$('tutLinea');
  $('tutCerrar').addEventListener('click',cerrar);$('tutAnt').addEventListener('click',()=>mover(-1));$('tutSig').addEventListener('click',()=>mover(1));
  arrastre(V.querySelector('.tutBarra'));
 }
 function arrastre(barra){
  let d=null;
  barra.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=V.getBoundingClientRect();d={dx:e.clientX-r.left,dy:e.clientY-r.top};try{barra.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();});
  barra.addEventListener('pointermove',e=>{if(!d)return;t.movido=true;poner(e.clientX-d.dx,e.clientY-d.dy);});
  const soltar=()=>{d=null;};barra.addEventListener('pointerup',soltar);barra.addEventListener('pointercancel',soltar);
 }
 function poner(x,y){const w=V.offsetWidth,h=V.offsetHeight;V.style.left=Math.max(4,Math.min(innerWidth-w-4,x))+'px';V.style.top=Math.max(4,Math.min(innerHeight-h-4,y))+'px';}
 const SECCIONES=Object.keys(PASOS);
 const seccion=()=>SECCIONES.find(id=>{const s=$(id);return s&&!s.classList.contains('oculta');})||null;
 const pasos=()=>(PASOS[t.sec]||[]);
 const disponible=p=>!p.si||p.si();
 function objetivo(p){for(const el of document.querySelectorAll(p.o))if(visible(el))return el;return null;}
 function mover(d){
  const P=pasos();if(t.fin&&d<0){t.fin=false;mostrar();return;}
  let i=t.i+d;while(i>=0&&i<P.length&&!disponible(P[i]))i+=d;
  if(i<0)return;if(i>=P.length){t.fin=true;mostrar();return;}t.i=i;mostrar();
 }
 function mostrar(){
  const P=pasos(),p=P[t.i];V.hidden=false;
  if(!p||t.fin){$('tutTitulo').textContent=`Tutorial · ${NOMBRE[t.sec]||''}`;$('tutCuenta').textContent='';$('tutTexto').textContent=p?'Listo este paso. El tutorial sigue cuando pases al paso siguiente del recorrido. Puedes mover o cerrar esta ventana.':'Este paso no tiene indicaciones.';$('tutEspera').hidden=true;$('tutAnt').disabled=!p;$('tutSig').disabled=true;t.objetivo=null;return;}
  const vis=P.filter(disponible),k=vis.indexOf(p)+1;
  $('tutTitulo').textContent=`Tutorial · ${NOMBRE[t.sec]}`;$('tutCuenta').textContent=`${k} de ${vis.length}`;
  $('tutTexto').textContent=typeof p.t==='function'?p.t():p.t;
  $('tutEspera').hidden=!p.espera;$('tutEspera').textContent=p.espera||'';
  $('tutAnt').disabled=vis[0]===p;$('tutSig').disabled=false;$('tutSig').textContent=k===vis.length?'Terminar →':'Siguiente →';
  t.objetivo=objetivo(p);
  if(t.objetivo){const r=t.objetivo.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)t.objetivo.scrollIntoView({block:'center',behavior:'smooth'});}
  if(!t.movido)ubicar();
 }
 // La ventana se ubica donde no tape el objetivo: a su derecha, a su izquierda, debajo o encima.
 function ubicar(){
  // Separacion de 56 px: la flecha siempre alcanza a verse entre la ventana y el objetivo.
  const w=V.offsetWidth,h=V.offsetHeight,m=56,W=innerWidth,H=innerHeight;
  if(!t.objetivo){poner(W-w-16,H-h-90);return;}
  const r=t.objetivo.getBoundingClientRect(),cy=Math.max(8,Math.min(H-h-8,r.top+r.height/2-h/2)),cx=Math.max(8,Math.min(W-w-8,r.left+r.width/2-w/2));
  const opciones=[[r.right+m,cy],[r.left-m-w,cy],[cx,r.bottom+m],[cx,r.top-m-h]];
  const cabe=([x,y])=>x>=4&&y>=4&&x+w<=W-4&&y+h<=H-4;
  const o=opciones.find(cabe)||[W-w-16,H-h-90];poner(o[0],o[1]);
 }
 // Punto donde la recta del centro de a hacia b sale del rectangulo a.
 function borde(a,bx,by){const cx=(a.left+a.right)/2,cy=(a.top+a.bottom)/2,dx=bx-cx,dy=by-cy,sx=dx?(a.right-a.left)/2/Math.abs(dx):Infinity,sy=dy?(a.bottom-a.top)/2/Math.abs(dy):Infinity,s=Math.min(sx,sy,1);return [cx+dx*s,cy+dy*s];}
 function dibujar(){
  const el=t.objetivo;
  if(!t.activo||V.hidden||!el||!visible(el)){L.setAttribute('d','');$('tutSombra').setAttribute('d','');M.hidden=true;return;}
  const r=el.getBoundingClientRect(),p=6,R={left:r.left-p,top:r.top-p,right:r.right+p,bottom:r.bottom+p};
  M.hidden=false;Object.assign(M.style,{left:R.left+'px',top:R.top+'px',width:(R.right-R.left)+'px',height:(R.bottom-R.top)+'px'});
  const v=V.getBoundingClientRect(),vc=[(v.left+v.right)/2,(v.top+v.bottom)/2],rc=[(R.left+R.right)/2,(R.top+R.bottom)/2];
  const a=borde(v,rc[0],rc[1]),b=borde(R,vc[0],vc[1]),dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);
  const solapa=!(v.right<R.left||v.left>R.right||v.bottom<R.top||v.top>R.bottom);
  if(d<24||solapa){L.setAttribute('d','');$('tutSombra').setAttribute('d','');return;}
  const k=.18,qx=(a[0]+b[0])/2-dy*k,qy=(a[1]+b[1])/2+dx*k,camino=`M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${qx.toFixed(1)},${qy.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
  L.setAttribute('d',camino);$('tutSombra').setAttribute('d',camino);
 }
 function ciclo(){
  if(!t.activo)return;
  const s=seccion();
  // En cada seccion nueva la ventana vuelve a ubicarse sola, aunque antes se haya arrastrado.
  if(s!==t.sec){t.sec=s;t.i=0;t.fin=false;t.movido=false;const P=pasos();while(t.i<P.length&&!disponible(P[t.i]))t.i++;if(s)mostrar();else{V.hidden=true;}}
  else if(s&&!t.fin){const p=pasos()[t.i];if(p){if(p.hasta&&p.hasta())mover(1);else if(!t.objetivo||!document.body.contains(t.objetivo)||!visible(t.objetivo))t.objetivo=objetivo(p);}}
  dibujar();t.raf=requestAnimationFrame(ciclo);
 }
 function abrir(){if(!V)crear();t.activo=true;t.sec=null;t.movido=false;cancelAnimationFrame(t.raf);t.raf=requestAnimationFrame(ciclo);const b=$('tutAbrir');if(b)b.setAttribute('aria-pressed','true');}
 function cerrar(){t.activo=false;cancelAnimationFrame(t.raf);if(V){V.hidden=true;M.hidden=true;L.setAttribute('d','');$('tutSombra').setAttribute('d','');}const b=$('tutAbrir');if(b)b.setAttribute('aria-pressed','false');try{localStorage.setItem('cardiaco7-tutorial-visto','1');}catch(err){}}
 // La primera vez que se abre el caso 7 en este navegador, el tutorial parte solo.
 function ofrecer(){let visto=false;try{visto=localStorage.getItem('cardiaco7-tutorial-visto')==='1';}catch(err){}if(!visto&&!t.activo)abrir();}
 function iniciar(){const b=$('tutAbrir');if(b)b.addEventListener('click',()=>t.activo?cerrar():abrir());addEventListener('resize',()=>{if(t.activo&&!t.movido)ubicar();});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
 return {abrir,cerrar,ofrecer,estado:t,PASOS};
})();
window.Tutorial7=Tutorial7;
