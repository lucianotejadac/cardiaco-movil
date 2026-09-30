/* Tutorial paso a paso del recorrido (casos 7 y 8, con pasos propios de cada caso): una ventana flotante que se arrastra por su barra, una flecha
   que apunta al control del paso y un marco que lo resalta. Sigue al estudiante: al pasar a otra
   seccion del recorrido muestra los pasos de esa seccion, y algunos pasos avanzan solos cuando el
   estudiante hace lo que se le pide (corregir, confirmar, ver el resultado del equipo). */
'use strict';
const Tutorial7=(()=>{
 const $=id=>document.getElementById(id);
 const est=()=>window.Caso7?Caso7.estado:{},gat=()=>est().sub==='gat',fase=()=>est().fase==='reposo'?'reposo':'estrés';
 // Caso abierto y textos que cambian segun el caso: K(texto del caso 7, texto del caso 8).
 const caso=()=>window.Caso7&&Caso7.caso?Caso7.caso.num:0,es8=()=>caso()===8,es7=()=>caso()===7,K=(t7,t8)=>es8()?t8:t7;
 // Un objetivo puede ser un elemento o una zona dentro de un lienzo ({virtual:true, getBoundingClientRect, visible}).
 const visible=el=>!!el&&(el.virtual?el.visible():el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden');
 // Pasos por seccion. o: selector del objetivo. t: texto. si: el paso se muestra solo si se cumple.
 // hasta: el paso avanza solo cuando se cumple. espera: lo que se muestra mientras tanto.
 const PASOS={
  qc:[
   {o:'#pasos7',t:()=>`Este es el recorrido del caso ${caso()||''}. Arriba están los pasos: A. Estrés, B. Reposo y, al final, los resultados. Puedes volver a cualquier paso ya hecho tocándolo.`},
   {o:'#qc .antecedentes7',si:()=>es8()&&visible(document.querySelector('#qc .antecedentes7')),t:'Estos son los antecedentes del caso: un paciente con tumor de páncreas, estrés farmacológico con adenosina en días distintos, y bloqueo de rama derecha con extrasístoles en el ECG. Tenlos presentes en cada paso: explican varias cosas que vas a ver.'},
   {o:'.saberMas',t:'En cada paso, «Saber más» explica las siglas, las unidades y los conceptos que se ven en ese momento en la pantalla.'},
   {o:'.preguntasBtn',t:'«Preguntas» muestra unas pocas preguntas de la clase de cardiología aplicadas a esta etapa. Respóndelas con lo que ves en el simulador.'},
   {o:'#rejilla',t:()=>`Control de calidad de las proyecciones del ${fase()}. El cine muestra el giro de la cámara y el sinograma, una fila a lo largo de todas las vistas. Un salto del paciente se ve como un corte brusco en la sinusoide del sinograma y como un escalón en el linograma.${K(fase()==='reposo'?' En el reposo de este caso hay actividad intestinal cerca del corazón: tenla presente.':'',' En este caso el estrés fue con adenosina, que suele aumentar la actividad del hígado y del intestino: mira cuánta hay bajo el diafragma en la imagen suma.')}`},
   {o:'#qc .controles',t:'«Vista» recorre el cine y «Fila» elige qué fila muestra el sinograma. También puedes tocar las imágenes.'},
   {o:'#modo',si:()=>!MovilCardiaco.estado.corr,t:'Pulsa «Corregir»: la aplicación busca los saltos y los corrige. Después verás dos columnas, sin corregir y corregido.',hasta:()=>!!MovilCardiaco.estado.corr,espera:'Esperando que pulses «Corregir»…'},
   {o:'#resumen',t:'Aquí se informa qué saltos encontró la aplicación y desde qué paso del giro. Compara el sinograma sin corregir con el corregido.'},
   {o:'#aRegistro',t:'Cuando estés conforme, sigue al registro con el CT.'}],
  reg:[
   {o:'#regFusion',t:()=>'La emisión, en color, sobre el CT, en gris. El CT se usa para corregir la atenuación, así que tiene que calzar con el corazón. Arrastra sobre la imagen para mover el CT.'+K(' En este caso las dos fases se adquirieron el mismo día, cada una con su propio CT.',' En este caso el estrés y el reposo se hicieron en días distintos: cada fase trae su propio CT y el registro se revisa en cada una.')},
   {o:'#reg .segmento',t:'Revisa los tres planos: axial, coronal y sagital. Mira la piel del tórax y el borde del corazón.'},
   {o:'#reg .controles',t:'«Corte» recorre los cortes, «SPECT» cambia la mezcla, nivel y ancho ajustan la ventana de la emisión, y el menú elige la ventana del CT. Las flechas mueven el CT de a 1 mm.'},
   {o:'#regConfirmar',si:()=>!Registro.estado.confirmado,t:'Cuando calce, pulsa «Confirmar registro».',hasta:()=>!!Registro.estado.confirmado,espera:'Esperando que confirmes el registro…'},
   {o:'#a7Reconstruir',t:'Ahora reconstruye con la receta del equipo. Toma cerca de un minuto en un computador, y más en una tablet.'}],
  caja:[
   {o:'#cajaCoronal',t:()=>gat()?`La suma de los 8 intervalos del gatillado del ${fase()}. Lleva la caja al corazón en el coronal y en el sagital.${es8()?' El paciente tiene extrasístoles: el gatillado rechaza los latidos que se salen de la tolerancia del intervalo R-R.':''}`:es8()?'La reconstrucción con la receta del equipo. Lleva la caja al corazón en el coronal y en el sagital. Con adenosina, el hígado y el intestino suelen captar más: deja la caja sobre el ventrículo, no sobre el abdomen.':'La reconstrucción con la receta del equipo. Lleva la caja al corazón en el coronal y en el sagital: arrastra dentro para moverla y desde una esquina para cambiar su tamaño.'},
   {o:'#a7NotaReposo',si:()=>visible($('a7NotaReposo')),t:'En el reposo hay actividad intestinal bajo el corazón. Es la que hizo fallar la máscara del equipo en el reposo con atenuación.'},
   {o:'#caja .refProy',si:()=>visible(document.querySelector('#caja .refProy')),t:'Abajo, dos proyecciones con la caja proyectada: el punto amarillo tiene que caer sobre el corazón.'},
   {o:'#aReorientar',t:'Con la caja sobre el ventrículo, sigue a la orientación de los ejes.'}],
  reo:[
   {o:'#reoAxial',t:'El eje parte en 0° de azimut y 0° de elevación, y tú lo corriges. La línea celeste es el eje, con el punto en el ápex, y el punto amarillo es el centro del ventrículo: arrástralo sobre cualquier imagen.'},
   {o:'#reo .controles',t:'Gira el azimut hasta que el eje pase por el ápex en el transaxial, y la elevación hasta que lo haga en el plano vertical.'},
   {o:'#reoCorto',t:()=>'Revisa los cortes: el eje corto tiene que quedar como un anillo parejo, el largo vertical como una «C» y el largo horizontal como una «U» invertida.'+K(' Si un sector de la pared capta menos, no dejes que desplace el centro.',' En este caso la captación es pareja: el anillo debería cerrarse en todo el ventrículo. Si ves un sector más pálido, revisa primero el eje y el centro.')},
   {o:'#a7Mapa',t:()=>`Cuando estés conforme, sigue: «${($('a7Mapa').textContent||'').replace(/\s*→\s*$/,'')}».`}],
  pantallas7:[
   {o:'#pantMenu',t:()=>K('Seis pantallas generadas con tus ejes, con la misma disposición que las del equipo: Splash y QPS sin atenuación (con estas se interpretó el estudio), las mismas con atenuación, y el QGS del estrés y del reposo.','Seis pantallas generadas con tus ejes, con la misma disposición que las del equipo: Splash y QPS sin y con atenuación, y el QGS del estrés y del reposo. En este caso el equipo guardó su pantalla QPS con atenuación: es la que puedes comparar mapa a mapa.')},
   {o:'#pantallas7 .antecedentes7',si:()=>es8()&&visible(document.querySelector('#pantallas7 .antecedentes7')),t:'Los antecedentes siguen aquí. Al leer las pantallas, compara los números con los rangos normales y con y sin atenuación: la pregunta es si hay algún defecto real.'},
   {o:'#pantTutorial',t:'«Pantalla final tutorial» recorre la pantalla que estás viendo: pone una flecha en cada resultado y explica qué significa tu valor. Úsalo en cada una de las seis pantallas.'},
   {o:'#pantLienzo',t:'La pantalla elegida. Arriba dice que la generó la aplicación y no el equipo. Tócala para verla ampliada.'},
   {o:'#pantNota',t:'Bajo la pantalla, una nota con lo más importante de lo que muestra.'},
   {o:'#pantMascara',si:()=>visible($('pantMascara')),t:'En las pantallas con atenuación, el reposo trae la falla de máscara del equipo. Este botón la explica.'},
   {o:'#pantDescargar',t:'Descarga la pantalla en PNG, para tu informe o para compararla con la del equipo.'},
   {o:'#pantRegenerar',t:'Si volviste a un paso y cambiaste un eje, vuelve a generar las pantallas con los ejes nuevos.'},
   {o:'#a7MapaDesdePantallas',t:'Después, revisa el mapa polar en detalle.'}],
  qps:[
   {o:'#qpsFase',t:'Elige la fase: estrés o reposo.'},
   {o:'#qpsTipo',t:()=>K('Y la reconstrucción: con o sin atenuación. Sin atenuación es con la que se interpretó el estudio; con atenuación, el reposo trae la falla de máscara del equipo.','Y la reconstrucción: con o sin atenuación. En este caso el equipo guardó sus mapas con atenuación: al revelar el resultado verás su mapa en esa reconstrucción. Sin atenuación, la referencia es una estimación desde sus puntajes.')},
   {o:'#qpsAviso',si:()=>visible($('qpsAviso')),t:'Este estudio trae una falla de máscara del equipo. Lee el aviso y toca «Ver más» para la explicación completa.'},
   {o:'#qpsEstado',t:'Aquí dice con qué eje se calculó y cuánto tardó. Si con un eje el ajuste de la pared deja de ser confiable, lo avisa en rojo.'},
   {o:'#qps .ejesVivo',t:'El eje, a la vista: en el transversal se ve el azimut y en el plano vertical, la elevación. La línea celeste es tu eje; después de revelar el resultado, la blanca punteada es la del equipo.'},
   {o:'#qps .ejesVivo2',t:'Eje corto, largo vertical y largo horizontal por el centro del ventrículo, con los bordes de la pared: amarillo el interno, naranja el externo.'},
   {o:'#qps .controles.fijo .fila',t:'Azimut y elevación giran tu eje hasta 25° a cada lado y todo se recalcula al momento. Así ves cuánto cambian los resultados con el eje.'},
   {o:'#qpsReceta',t:'Receta de reconstrucción: puedes probar otras iteraciones, otro filtro o quitar correcciones. La extensión cambia porque el límite normal vale para la receta del equipo.'},
   {o:'#qpsTabla',t:'Tus resultados. Volumen: la cavidad. Pared: el miocardio. Cuentas: lo que suma la pared. Defecto: ml bajo el límite normal. Extensión: porcentaje del ventrículo bajo el límite. TPD: combina extensión y severidad. Forma y excentricidad: la geometría. SSS y SS%: los puntajes.'},
   {o:'#qpsRevelar',si:()=>!Qps.estado.revelar,t:'Pulsa «Ver el resultado del equipo» para comparar par a par: tus números junto a los del equipo, y tu mapa junto al suyo.',hasta:()=>!!Qps.estado.revelar,espera:'Esperando que pulses «Ver el resultado del equipo»…'},
   {o:'#qpsMapas',t:'Tu mapa a la izquierda y el del equipo a la derecha. El centro es el ápex y el borde la base; arriba anterior, abajo inferior, a la izquierda el septum y a la derecha la pared lateral. En negro, bajo el límite normal; los números son el porcentaje anormal de cada segmento.'},
   {o:'#qpsMapas',si:()=>!!Qps.estado.revelar,t:()=>K('Cambia entre estrés y reposo con el menú de arriba: si la zona negra del estrés desaparece en el reposo, el defecto es reversible. El equipo guardó sus mapas sin atenuación.','Cambia entre estrés y reposo, y entre con y sin atenuación, con los menús de arriba: si casi no hay zona negra con atenuación en ninguna fase, la perfusión es normal. Revisa si lo que aparece sin atenuación desaparece al corregirla.')},
   {o:'#qpsPuntajesCaja',t:'Puntajes por segmento, de 0 (normal) a 4 (sin captación): los tuyos y los del equipo. Los colores son los territorios: beige la descendente anterior, azul la coronaria derecha y verde la circunfleja.'},
   {o:'#qpsCortes',t:'Tres ejes cortos, largo horizontal, largo vertical y la superficie del ventrículo, con los bordes que usó el cálculo. Si no siguen la pared, revisa tu eje.'},
   {o:'#qpsSplash',t:'Todos los cortes con tu eje: 14 ejes cortos del ápex a la base, 7 largos verticales y 7 horizontales.'},
   {o:'#qpsSegmentos',t:'Por segmento: valor medio, porcentaje anormal y puntaje, tuyos y del equipo. En amarillo, lo que difiere.'},
   {o:'#qpsNota',t:'De dónde salen la referencia y el límite normal de este caso.'},
   {o:'#a7Qgs',t:'Sigue al mapa QGS.'}],
  qgs7:[
   {o:'#qgsFase',t:'Elige la fase del gatillado: estrés o reposo.'},
   {o:'#qgsEstado',t:()=>K('Tu eje del gatillado y la receta del equipo con que se reconstruyó: OSEM 4 × 4, gaussiano de 8,4 mm, sin atenuación.','Tu eje del gatillado y la receta con que se reconstruyó: OSEM 4 × 4, gaussiano de 8,4 mm, sin atenuación. Es la del caso 7, porque este caso no trae el gatillado reconstruido por el equipo.')},
   {o:'#qgs3d',t:'El ventrículo en 3D late con los 8 intervalos: en gris la superficie interna, en naranja la externa en fin de diástole. Arrástralo para girarlo.'},
   {o:'#qgsLatir',t:'Para o hace latir el ventrículo.'},
   {o:'#qgsTabla',t:()=>'EDV y ESV: el ventrículo lleno y vacío. SV: lo que expulsa en cada latido. Fracción de eyección: SV sobre EDV. Forma y excentricidad. PER, PFR, PFR2, MFR/3 y TTPF: cómo se vacía y se llena.'+K('',' En este caso compara la fracción de eyección con el límite normal de la clase y con el del informe.')},
   {o:'#qgsRevelar',si:()=>!Gatillado7.estado.revelar,t:'Pulsa «Ver el resultado del equipo» para comparar par a par.',hasta:()=>!!Gatillado7.estado.revelar,espera:'Esperando que pulses «Ver el resultado del equipo»…'},
   {o:'#qgsCurvas',t:()=>'La curva de volumen de los 8 intervalos, en rojo, y su pendiente, en gris: el mínimo es el fin de sístole y la subida después es el llenado. Al revelar, la del equipo queda al lado.'+K(' En este caso el fin de diástole está en el primer intervalo y el de sístole, en el cuarto.',' En este caso el equipo puso el fin de diástole en el último intervalo, en las dos fases; el fin de sístole está en el intervalo 3 en estrés y en el 4 en reposo.')},
   {o:'#qgsEd',t:'Perfusión en fin de diástole, en porcentaje del máximo, por segmento.'},
   {o:'#qgsEs',t:'Perfusión en fin de sístole: más alta que en diástole, porque la pared engrosada suma más cuentas.'},
   {o:'#qgsMov',t:'Movimiento del borde interno, en mm. El septum se mueve menos que la pared lateral, y eso es normal.'},
   {o:'#qgsEng',t:()=>'Engrosamiento de la pared, en porcentaje. Un segmento con poca captación que sí engrosa sugiere artefacto de atenuación; uno que no engrosa sugiere cicatriz.'+K(' En este caso mira la pared inferolateral, donde estaba el defecto de perfusión.',' En un estudio normal todos los segmentos engruesan: busca el menor y compáralo con los demás.')},
   {o:'#qgsCortes',t:'Fin de diástole arriba y fin de sístole abajo: la cavidad se achica y la pared se engruesa.'},
   {o:'#qgsNota',t:'Lo que informó el equipo y cómo se calibró esta sección. Con esto termina el recorrido.'}]};
 const NOMBRE={qc:'Control de calidad',reg:'Registro',caja:'Caja',reo:'Orientación de los ejes',pantallas7:'Pantallas finales',qps:'Mapa polar',qgs7:'Mapa QGS'};
 const t={activo:false,sec:null,i:0,movido:false,fin:false,raf:0,objetivo:null,custom:null};
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
 const pasos=()=>t.custom?t.custom.pasos:(PASOS[t.sec]||[]);
 const nombre=()=>t.custom?t.custom.nombre:(NOMBRE[t.sec]||'');
 const disponible=p=>!p.si||p.si();
 function objetivo(p){if(typeof p.o==='function'){const v=p.o();return visible(v)?v:null;}for(const el of document.querySelectorAll(p.o))if(visible(el))return el;return null;}
 function mover(d){
  const P=pasos();if(t.fin&&d<0){t.fin=false;mostrar();return;}
  let i=t.i+d;while(i>=0&&i<P.length&&!disponible(P[i]))i+=d;
  if(i<0)return;if(i>=P.length){t.fin=true;mostrar();return;}t.i=i;mostrar();
 }
 function mostrar(){
  const P=pasos(),p=P[t.i];V.hidden=false;
  if(!p||t.fin){$('tutTitulo').textContent=`Tutorial · ${nombre()}`;$('tutCuenta').textContent='';$('tutTexto').textContent=p?(t.custom&&t.custom.fin?t.custom.fin:'Listo este paso. El tutorial sigue cuando pases al paso siguiente del recorrido. Puedes mover o cerrar esta ventana.'):'Este paso no tiene indicaciones.';$('tutEspera').hidden=true;$('tutAnt').disabled=!p;$('tutSig').disabled=true;t.objetivo=null;return;}
  const vis=P.filter(disponible),k=vis.indexOf(p)+1;
  $('tutTitulo').textContent=`Tutorial · ${nombre()}`;$('tutCuenta').textContent=`${k} de ${vis.length}`;
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
  if(t.custom&&s!==t.custom.seccion)t.custom=null;
  if(s!==t.sec){t.sec=s;t.i=0;t.fin=false;t.movido=false;const P=pasos();while(t.i<P.length&&!disponible(P[t.i]))t.i++;if(s)mostrar();else{V.hidden=true;}}
  else if(s&&!t.fin){const p=pasos()[t.i];if(p){if(p.hasta&&p.hasta())mover(1);else if(!t.objetivo||(t.objetivo.virtual?false:!document.body.contains(t.objetivo))||!visible(t.objetivo))t.objetivo=objetivo(p);}}
  dibujar();t.raf=requestAnimationFrame(ciclo);
 }
 // Recorrido a pedido dentro de una seccion (por ejemplo, la pantalla final que se esta viendo).
 function recorrer(o){if(!V)crear();t.custom=o;t.sec=o.seccion;t.i=0;t.fin=false;t.movido=false;const P=pasos();while(t.i<P.length&&!disponible(P[t.i]))t.i++;if(!t.activo){t.activo=true;cancelAnimationFrame(t.raf);t.raf=requestAnimationFrame(ciclo);const b=$('tutAbrir');if(b)b.setAttribute('aria-pressed','true');}mostrar();}
 function abrir(){if(!V)crear();t.activo=true;t.sec=null;t.movido=false;t.custom=null;cancelAnimationFrame(t.raf);t.raf=requestAnimationFrame(ciclo);const b=$('tutAbrir');if(b)b.setAttribute('aria-pressed','true');}
 function cerrar(){t.activo=false;t.custom=null;cancelAnimationFrame(t.raf);if(V){V.hidden=true;M.hidden=true;L.setAttribute('d','');$('tutSombra').setAttribute('d','');}const b=$('tutAbrir');if(b)b.setAttribute('aria-pressed','false');try{localStorage.setItem('cardiaco7-tutorial-visto','1');}catch(err){}}
 // La primera vez que se abre el caso 7 en este navegador, el tutorial parte solo.
 function ofrecer(){let visto=false;try{visto=localStorage.getItem('cardiaco7-tutorial-visto')==='1';}catch(err){}if(!visto&&!t.activo)abrir();}
 function iniciar(){const b=$('tutAbrir');if(b)b.addEventListener('click',()=>t.activo?cerrar():abrir());addEventListener('resize',()=>{if(t.activo&&!t.movido)ubicar();});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
 function pasosDe(sec){return (PASOS[sec]||[]).filter(disponible).map(p=>typeof p.t==='function'?p.t():p.t);}
 return {abrir,cerrar,ofrecer,recorrer,pasosDe,estado:t,PASOS};
})();
window.Tutorial7=Tutorial7;
