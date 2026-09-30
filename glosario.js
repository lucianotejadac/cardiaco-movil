/* «Saber más»: un boton en cada paso que explica las siglas, las unidades de medida y los conceptos
   que se ven en la pantalla en ese momento. Lee el texto visible de la seccion abierta, los rotulos
   de las imagenes (aria-label, alt) y los terminos dibujados dentro de los lienzos (data-terminos),
   y muestra solo las entradas del glosario que aparecen. */
'use strict';
const Glosario=(()=>{
 const $=id=>document.getElementById(id);
 const L='A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ';
 // Termino como palabra entera: sin letras ni digitos a los lados (sin lookbehind, por Safari antiguo).
 const pal=(s,f='')=>new RegExp(`(^|[^${L}])(${s})(?=$|[^${L}])`,f);
 const S=(t,d,p)=>({c:'sigla',t,d,p:p||pal(t.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&'))});
 const U=(t,d,p)=>({c:'unidad',t,d,p});
 const C=(t,d,p)=>({c:'concepto',t,d,p:p||pal(t,'i')});
 const G=[
  // ---------- siglas ----------
  S('SPECT','Tomografía computarizada por emisión de fotón único. La cámara gira alrededor del paciente, registra los fotones del radiofármaco desde muchos ángulos y con eso se reconstruyen cortes del corazón.'),
  S('CT','Tomografía computarizada con rayos X. En este examen sirve para corregir la atenuación: dice cuánto tejido atraviesa cada fotón antes de llegar a la cámara.'),
  S('FBP','Retroproyección filtrada (filtered back projection). Reconstrucción rápida: cada proyección se filtra con un filtro rampa y se proyecta de vuelta sobre el volumen. Aquí se usa para el registro con el CT.'),
  S('OSEM','Maximización de la expectativa con subconjuntos ordenados. Reconstrucción iterativa: parte de una imagen uniforme y la corrige comparando sus proyecciones con las medidas. «6 × 4» son 6 iteraciones con 4 subconjuntos de vistas.'),
  S('AC','Corrección de atenuación (attenuation correction), con el mapa del CT. «NoAC» o «sin atenuación» es la reconstrucción sin esa corrección.',pal('AC|NoAC|NO AC')),
  S('SC','Corrección de dispersión (scatter correction). Resta los fotones que se desviaron en el cuerpo, estimados con una segunda ventana de energía.'),
  S('FWHM','Ancho a media altura (full width at half maximum). Mide el ancho del filtro gaussiano final, en milímetros: más ancho, imagen más suave y defectos más borrosos.'),
  S('QPS','Quantitative Perfusion SPECT: programa del equipo que arma el mapa polar, compara con una base de normales y calcula la extensión, el TPD y los puntajes.'),
  S('QGS','Quantitative Gated SPECT: programa del equipo que mide el ventrículo en cada intervalo del ciclo cardíaco: volúmenes, fracción de eyección, movimiento y engrosamiento de la pared.'),
  S('QC','Control de calidad (quality control). En «QC=1.90» o «QC=4.47» es el indicador de calidad de la segmentación del ventrículo que informa el programa del equipo: más bajo es mejor. Cuando la segmentación falla, el programa lo avisa, por ejemplo con «Mask Failure».'),
  S('IR','Otro indicador de calidad que el programa del equipo informa junto al QC. Las pantallas no dicen cómo se calcula.'),
  S('SSS','Summed stress score: suma de los puntajes de los 17 segmentos en estrés. Cada segmento va de 0 (normal) a 4 (ausencia de captación).'),
  S('SRS','Summed rest score: suma de los puntajes de los 17 segmentos en reposo.'),
  S('SDS','Summed difference score: suma, segmento por segmento, de lo que el puntaje de estrés supera al de reposo. Mide la isquemia reversible.'),
  S('SS%','Suma de puntajes expresada como porcentaje del máximo posible (17 segmentos × 4 = 68). Igual para SR% y SD%.',pal('SS%|SR%|SD%')),
  S('TPD','Total perfusion deficit: porcentaje del ventrículo con defecto de perfusión, combinando extensión y severidad.'),
  S('TID','Dilatación isquémica transitoria (transient ischemic dilation): volumen del ventrículo en estrés dividido por el de reposo. Si la segmentación falla, como en el reposo con atenuación de este caso, el TID sale falso.'),
  S('EDV','Volumen de fin de diástole (end-diastolic volume), en ml: el ventrículo más lleno del ciclo.'),
  S('ESV','Volumen de fin de sístole (end-systolic volume), en ml: el ventrículo más vacío del ciclo.'),
  S('SV','Volumen sistólico (stroke volume): EDV menos ESV, en ml. Lo que expulsa el ventrículo en cada latido.'),
  S('EF','Fracción de eyección (ejection fraction): SV dividido por EDV, en porcentaje.',pal('EF|FE')),
  S('PER','Peak emptying rate: velocidad máxima de vaciado del ventrículo en la sístole, en volúmenes de fin de diástole por segundo (EDV/s). Es negativa porque el volumen baja.'),
  S('PFR','Peak filling rate: velocidad máxima de llenado en la diástole, en EDV/s. PFR2 es el segundo pico, el de la contracción de la aurícula.',pal('PFR2?')),
  S('MFR/3','Mean filling rate del primer tercio de la diástole, en EDV/s.',/MFR\/3/),
  S('TTPF','Time to peak filling: tiempo desde el fin de la sístole hasta el pico de llenado, en milisegundos.'),
  S('BPM','Latidos por minuto (beats per minute) durante la adquisición gatillada.'),
  S('R-R','Intervalo entre dos ondas R del electrocardiograma: la duración de un latido, en ms. El gatillado lo divide en 8 intervalos.'),
  S('SI','Índice de forma (shape index): diámetro mayor del ventrículo dividido por su largo. Un ventrículo más esférico tiene un SI mayor.',/\[SI|\(SI\)|SI ED|SI ES|Forma/),
  S('Ecc','Excentricidad del elipsoide que se ajusta al ventrículo: 0 es una esfera y cerca de 1, un elipsoide muy alargado.',pal('Ecc|Excentricidad','i')),
  S('ED / ES','Fin de diástole (end diastole) y fin de sístole (end systole): los intervalos del ciclo en que el ventrículo está más lleno y más vacío.',pal('ED|ES')),
  S('SAX / VLA / HLA','Planos del corazón: eje corto (short axis), eje largo vertical (vertical long axis) y eje largo horizontal (horizontal long axis).',pal('SAX|VLA|HLA')),
  S('ANT / INF / SEPT / LAT','Paredes del ventrículo izquierdo: anterior, inferior, septal y lateral. El ápex es la punta y la base, el lado de las válvulas.',pal('ANT|INF|SEPT|LAT')),
  S('Str / Rst / Rev','Dianas de puntajes de estrés (stress), reposo (rest) y reversibilidad: los puntajes que bajan de estrés a reposo.',pal('Str|Rst|Rev')),
  S('DICOM','Formato estándar de las imágenes médicas. Cada archivo trae la imagen y su descripción: tamaño de píxel, ángulos, series, etc.'),
  S('ZIP','Archivo comprimido que trae todas las series del caso: proyecciones, CT, gatillada y referencias del equipo.'),
  S('μ','Coeficiente de atenuación lineal: cuánto atenúa cada punto del cuerpo a los fotones de 140 keV. El mapa μ se calcula desde el CT.',/μ|mapa mu/i),
  // palabras en ingles de las pantallas del equipo
  S('Stress / Rest','Estrés y reposo: las dos fases del estudio de perfusión.',pal('Stress|Rest')),
  S('Recon','Reconstrucción: los cortes obtenidos a partir de las proyecciones.',pal('Recon')),
  S('Gated','Gatillado: adquisición sincronizada con el electrocardiograma, en 8 intervalos del ciclo.',pal('Gated')),
  S('Splash','Pantalla del equipo con todos los cortes de las dos fases, en eje corto, largo vertical y largo horizontal.',pal('Splash')),
  S('Extent','Extensión: porcentaje del ventrículo bajo el límite normal.',pal('Extent')),
  S('Reversibility','Reversibilidad: lo que está bajo el límite normal en estrés y no en reposo.',pal('Reversibility')),
  S('Motion / Thickening','Movimiento y engrosamiento de la pared entre fin de diástole y fin de sístole.',pal('Motion|Thickening')),
  S('Volume / Wall / Defect / Shape','Volumen de la cavidad, volumen y cuentas de la pared, volumen del defecto y forma, en las pantallas del equipo.',pal('Volume|Wall|Defect|Shape')),
  S('Dataset / Recipe / Results','Serie de imágenes, receta de reconstrucción y origen de los resultados, en los recuadros de las pantallas.',pal('Dataset|Recipe|Results')),
  S('Mask Failure','Falla de máscara: el programa del equipo no logró separar bien el ventrículo del resto de la imagen. En este caso pasó en el reposo con atenuación; «Ver más sobre la falla de máscara» lo explica.',/Mask Failure|falla de máscara/i),
  // ---------- unidades ----------
  U('mm','Milímetros. Tamaño del píxel, ancho del filtro y desplazamientos del CT.',pal('mm')),
  U('cm','Centímetros. Tamaño de la caja.',pal('cm')),
  U('ml','Mililitros. Volúmenes de la cavidad, de la pared y del defecto.',pal('ml')),
  U('%','Porcentaje. En el mapa polar, cada punto es el porcentaje de la captación máxima del ventrículo; la extensión y el TPD son porcentajes del ventrículo.',/%/),
  U('°','Grados. El azimut y la elevación del eje, y los ángulos de las vistas del giro.',/°/),
  U('ms','Milisegundos. Duración del latido (R-R) y tiempo al pico de llenado (TTPF).',pal('ms')),
  U('s','Segundos. Tiempo de cálculo.',/\d+(,\d+)? s\b/),
  U('EDV/s','Volúmenes de fin de diástole por segundo: la velocidad de vaciado o de llenado dividida por el EDV, para comparar corazones de distinto tamaño.',/EDV\/s/),
  U('ml/s','Mililitros por segundo: velocidad de llenado en la curva del equipo.',/ml\/s/),
  U('mil / k','Miles de cuentas: «1106k» o «1106 mil» son 1 106 000 cuentas en la pared.',/\d\s?k\b|\d mil\b/),
  U('píxel / vóxel','Píxel: el cuadrado más pequeño de una imagen. Vóxel: el cubo más pequeño de un volumen. Aquí miden 3,3 mm de lado.',/píxel|pixel|vóxel|voxel/i),
  U('cuentas','Fotones detectados con la energía del tecnecio. Más cuentas dan una imagen menos granulada.',pal('cuentas?','i')),
  U('sigmas','Unidad del ancho del perfil de la pared: los bordes interno y externo se ponen a una cierta cantidad de sigmas del máximo del perfil.',pal('sigmas?','i')),
  // ---------- conceptos ----------
  C('proyección','Imagen plana que registra la cámara desde un ángulo. El giro completo junta 64 proyecciones.',pal('proyecci(ón|ones)','i')),
  C('cine','Las proyecciones mostradas una tras otra, como una película del giro. Sirve para ver si el paciente se movió.'),
  C('sinograma','Una misma fila de todas las proyecciones, una bajo otra. Un punto del cuerpo dibuja una sinusoide; un movimiento del paciente la corta.',pal('sinogramas?','i')),
  C('linograma','Suma de cada fila de cada proyección. Un salto del paciente a lo largo de la camilla aparece como un escalón.',pal('linogramas?','i')),
  C('imagen suma','Suma de todas las proyecciones: muestra dónde está la actividad en el cuerpo.'),
  C('corrección de movimiento','La aplicación compara cada vista con sus vecinas, detecta los saltos del paciente y desplaza las vistas afectadas para devolverlas a su lugar.',/corregi(r|do|das)|corrección de movimiento|saltos?/i),
  C('registro','Alinear el CT con la emisión, para que el mapa de atenuación calce con el corazón.',pal('registro','i')),
  C('fusión','La emisión en color sobre el CT en gris, en la misma imagen.',pal('fusión','i')),
  C('ventana','Rango de valores que se muestra en la escala de grises o de color. El nivel es el centro y el ancho, la amplitud.',pal('ventana|nivel|ancho','i')),
  C('atenuación','Los fotones que salen del corazón se absorben en parte en el cuerpo antes de llegar a la cámara; las paredes más profundas se ven más pálidas. La corrección usa el CT para compensarlo.',pal('atenuación','i')),
  C('dispersión','Fotones que se desviaron dentro del cuerpo y llegan a la cámara desde un lugar equivocado. Empañan la imagen.',pal('dispersión','i')),
  C('receta','El conjunto de parámetros de la reconstrucción: método, iteraciones, subconjuntos, filtro y correcciones.',pal('recetas?','i')),
  C('iteraciones y subconjuntos','En OSEM, cada iteración recorre todas las vistas, repartidas en subconjuntos. Más iteraciones dan más detalle y más ruido.',/iteraci|subconjunto/i),
  C('filtro gaussiano','Suavizado final de la reconstrucción; su ancho se da como FWHM en mm.',/gaussian/i),
  C('caja','Rectángulo que se pone sobre el corazón en coronal y sagital. Su centro es el punto de partida del centro del ventrículo.',pal('caja','i')),
  C('reorientación','Girar los cortes para que sigan el eje largo del ventrículo, que en el cuerpo está inclinado. Así los cortes de eje corto salen como anillos.',/reorienta|orientación|orientar/i),
  C('azimut','Ángulo del eje largo en el corte transversal: cuánto apunta el ápex hacia la izquierda del paciente.',pal('azimut','i')),
  C('elevación','Ángulo del eje largo en el plano vertical: cuánto baja el ápex.',pal('elevación','i')),
  C('eje largo','Línea que va de la base al ápex del ventrículo izquierdo. Los tres planos cardíacos se definen respecto de ella.',/eje largo|el eje|tu eje|eje del equipo/i),
  C('techo','Máximo de la escala de color. Bajarlo sirve cuando el hígado o el intestino brillan más que el corazón.',pal('techo','i')),
  C('transaxial','Corte perpendicular al eje largo del cuerpo, como los del CT.',pal('transaxial|transversal','i')),
  C('coronal y sagital','Cortes verticales del cuerpo: el coronal, de frente; el sagital, de lado.',pal('coronal|sagital','i')),
  C('mapa polar','El ventrículo desplegado como un disco: el centro es el ápex, el borde la base; arriba la pared anterior, abajo la inferior, a la izquierda el septum y a la derecha la pared lateral.',pal('mapas? polar(es)?','i')),
  C('límite normal','Por debajo de este valor un punto del mapa se considera anormal. Viene de una base de datos de personas sanas; aquí es el de este paciente, calibrado con lo que informó el equipo.',/límite normal|bajo el límite/i),
  C('base de normales','Base de datos de personas sanas con la que el equipo compara, según sexo, fase y reconstrucción (por ejemplo, symbiaMaleStressTc_AC).',/base de normales|symbia/i),
  C('extensión','Porcentaje del ventrículo que queda bajo el límite normal.',pal('extensión','i')),
  C('defecto','Zona de la pared con menos captación de la esperada. Su volumen se da en ml.',pal('defectos?','i')),
  C('pared','El miocardio del ventrículo izquierdo. Su volumen se mide entre el borde externo y el interno.',pal('pared(es)?','i')),
  C('segmentos','El ventrículo se divide en 17 segmentos: 6 basales, 6 medios, 4 apicales y el ápex. Cada uno recibe un puntaje de 0 a 4.',pal('segmentos?','i')),
  C('puntajes','Calificación de cada segmento de 0 (normal) a 4 (sin captación). Se suman en SSS, SRS y SDS.',pal('puntajes?','i')),
  C('reversibilidad','Lo que está bajo el límite en estrés y no en reposo: indica isquemia, no cicatriz.',pal('reversibilidad','i')),
  C('máscara','Región con que el programa separa el ventrículo del resto de la imagen antes de medir.',pal('máscara','i')),
  C('referencia','Lo que da la reconstrucción del simulador con el eje y la receta del equipo; los números de la columna «Equipo» son los que informó el equipo.',pal('referencia','i')),
  C('gatillado','Adquisición sincronizada con el electrocardiograma: cada latido se divide en 8 intervalos y se reconstruye un volumen por intervalo.',pal('gatillad[oa]s?','i')),
  C('intervalos','Las 8 partes en que se divide el latido en el gatillado.',pal('intervalos?','i')),
  C('curva de volumen','El volumen del ventrículo en cada intervalo del ciclo, unido por una curva. De su pendiente salen el vaciado y el llenado.',/curva/i),
  C('llenado y vaciado','Velocidad con que el ventrículo se llena en la diástole y se vacía en la sístole.',/llenado|vaciado|Filling/i),
  C('movimiento de la pared','Cuánto se mueve el borde interno entre fin de diástole y fin de sístole, en mm.',pal('movimiento','i')),
  C('engrosamiento','Cuánto aumenta la pared entre fin de diástole y fin de sístole, en porcentaje. Se mide por el aumento de cuentas de la pared.',pal('engrosamiento','i')),
  C('superficie interna y externa','Los bordes del miocardio: la interna limita la cavidad y la externa, el epicardio.',/superficie|borde interno|borde externo/i),
  C('fracción de eyección','Porcentaje del volumen de fin de diástole que el ventrículo expulsa en cada latido.',pal('fracción de eyección','i')),
  C('forma','Qué tan esférico es el ventrículo; se mide con el índice de forma (SI).',pal('forma','i')),
  C('ápex y base','El ápex es la punta del ventrículo izquierdo; la base, el lado de las válvulas.',/ápex|apex|base\b/i),
  C('candado','Botón redondo abajo a la derecha. Cerrado, la pantalla solo se desplaza; abierto, se pueden mover los deslizadores y los ejes.',/candado/i)
 ];
 const GRUPOS=[['sigla','Siglas y rótulos'],['unidad','Unidades de medida'],['concepto','Conceptos']];
 function textoVisible(){
  const s=[...document.querySelectorAll('main > section')].find(x=>!x.classList.contains('oculta'));
  // De la barra de pasos solo cuenta el paso actual: el resto no es de esta pantalla.
  const act=document.querySelector('.paso7.actual'),partes=[$('titulo').textContent,act&&!$('pasos7').hidden?act.textContent:''];
  if(s){partes.push(s.innerText);s.querySelectorAll('canvas,img').forEach(e=>{if(e.getClientRects().length)partes.push(e.getAttribute('aria-label')||'',e.getAttribute('alt')||'',e.dataset.terminos||'');});}
  return {texto:partes.join('\n'),s};
 }
 let D=null;
 function dialogo(){
  if(D)return D;D=document.createElement('dialog');D.id='dSaberMas';D.className='saberMasDlg';
  D.innerHTML='<h2 id="smTitulo">Saber más</h2><p id="smIntro" class="clave"></p><div id="smCuerpo"></div><button type="button" class="boton" id="smCerrar">Cerrar</button>';
  document.body.append(D);$('smCerrar').addEventListener('click',()=>D.close());D.addEventListener('click',e=>{if(e.target===D)D.close();});return D;
 }
 function abrir(){
  const {texto,s}=textoVisible(),d=dialogo(),paso=document.querySelector('.paso7.actual');
  const hay=G.filter(g=>g.p.test(texto));
  $('smTitulo').textContent='Saber más'+(paso?` · ${paso.textContent}`:s&&s.querySelector('.columna')?` · ${s.querySelector('.columna').textContent}`:'');
  $('smIntro').textContent=hay.length?`Lo que aparece ahora en la pantalla (${hay.length} ${hay.length===1?'término':'términos'}).`:'En esta pantalla no hay siglas ni unidades que explicar.';
  const cuerpo=$('smCuerpo');cuerpo.replaceChildren();
  for(const [c,n] of GRUPOS){const g=hay.filter(x=>x.c===c);if(!g.length)continue;const h=document.createElement('h3');h.className='qpsT';h.textContent=n;const dl=document.createElement('dl');dl.className='leyenda';
   for(const x of g){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=x.t;dd.textContent=x.d;dl.append(dt,dd);}cuerpo.append(h,dl);}
  d.showModal();d.scrollTop=0;
 }
 // Lo que va dibujado dentro de cada lienzo (no es texto de la pagina).
 const DIBUJADO={qgs3d:'BASE ANT SEPT ÁPEX INF intervalo ml superficie interna superficie externa',qgsCurva:'curva de volumen ml llenado intervalos',qgsCortes:'fin de diástole fin de sístole eje corto largo vertical largo horizontal',
  qpsCortes:'eje corto largo horizontal largo vertical superficie ANT INF SEPT ÁPEX borde interno borde externo base',qpsPolar:'mapa polar extensión % segmentos límite normal',qpsPolarRef:'mapa polar extensión % segmentos límite normal eje del equipo',qpsPuntajes:'puntajes segmentos',qpsPuntajesRef:'puntajes segmentos',
  qpsEjeAxial:'transversal azimut eje centro ápex',qpsEjeVertical:'plano vertical elevación eje',qgsEd:'ED %',qgsEs:'ES %',qgsMov:'movimiento mm',qgsEng:'engrosamiento %',regFusion:'SPECT CT fusión',
  reoAxial:'transaxial eje centro ápex',reoVertical:'plano vertical eje elevación',reoCorto:'eje corto',reoVla:'largo vertical',reoHla:'largo horizontal',cajaCoronal:'coronal caja',cajaSagital:'sagital caja'};
 for(const id in DIBUJADO){const e=$(id);if(e)e.dataset.terminos=DIBUJADO[id];}
 const EQ={ed:'ED Perfusion %',es:'ES Perfusion %',mov:'Motion mm ED',eng:'Thickening % ES'};
 document.querySelectorAll('#qgsMapas figure.equipo').forEach(f=>{const im=f.querySelector('img');if(im)im.dataset.terminos=EQ[f.dataset.mapa]||'';});
 {const c=document.querySelector('#qgsCurvaEquipo img');if(c)c.dataset.terminos='LV Volume ml Filling ml/s intervalos';const q=document.querySelector('#qpsPolarEquipo img');if(q)q.dataset.terminos='Stress Rest Extent % segmentos límite normal';}
 // Un boton por paso, arriba de cada seccion (queda en el panel de la derecha en la tablet).
 const SECCIONES=['qc','reg','osem','gat','cmp','caja','reo','qps','qgs7','pantallas7'];
 for(const id of SECCIONES){const s=$(id);if(!s)continue;const b=document.createElement('button');b.type='button';b.className='saberMas';b.textContent='Saber más';b.setAttribute('aria-label','Saber más: siglas, unidades y conceptos de esta pantalla');b.addEventListener('click',abrir);s.insertBefore(b,s.firstChild);}
 return {abrir,GLOSARIO:G,textoVisible};
})();
window.Glosario=Glosario;
