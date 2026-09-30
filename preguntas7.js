/* Casos 7 y 8: botón «Preguntas» en cada etapa del recorrido. Pocas preguntas por etapa, tomadas de la
   clase «CT13. Exploraciones de MN en Cardiología» del curso (U-Cursos, TM08315) y aplicadas a lo
   que se ve en ese paso del simulador. Cada pregunta dice de qué lámina viene. No trae respuestas:
   las respuestas son parte de la evaluación del estudiante. */
'use strict';
const Preguntas7=(()=>{
 const $=id=>document.getElementById(id);
 const est=()=>window.Caso7?Caso7.estado:{},rep=()=>est().fase==='reposo',gat=()=>est().sub==='gat';
 // Por caso y por seccion: lista de {l: laminas de la clase, q: texto}; cambian segun la fase y el paso.
 const P7={
  qc:()=>[
   rep()?{l:'71–72',q:'En el reposo, ¿la corrección automática encontró saltos? La clase describe que, al terminar un esfuerzo, el corazón puede cambiar de posición por el aumento del volumen pulmonar. ¿Qué fase de este caso es más propensa a ese desplazamiento, y qué muestra el control de calidad de cada una?'}
        :{l:'71–72',q:'La clase indica que el movimiento del paciente es la causa más común de artefactos en SPECT y que se controla con el cine y el sinograma. En este estudio, ¿en qué pasos del giro aparecen los saltos, cómo se ven en el sinograma y en el linograma, y qué pasaría con el mapa polar si no se corrigieran?'},
   {l:'64–65',q:'El resumen del control de calidad informa el número de vistas y el arco del giro. Con dos cabezales a 90°, ¿cuánto gira cada cabezal y cada cuántos grados se adquiere una vista? ¿Coincide con los parámetros de adquisición de la clase: 32 a 64 imágenes, cada 3 a 6°?'}],
  reg:()=>[
   {l:'75 y 84',q:'La clase describe la atenuación diafragmática, que en hombres puede simular un defecto de la pared inferior, y la mamaria, que en mujeres afecta la pared anterior y septal. En este paciente, ¿qué pared se espera más atenuada, y cómo se usa el CT registrado para corregirla?'},
   {l:'70',q:'Si el CT quedara corrido unos milímetros respecto de la emisión, ¿qué error aparecería en la reconstrucción con atenuación, y en qué zona del corazón se notaría más?'}],
  caja:()=>gat()?[
   {l:'66',q:'La clase indica que el ciclo cardíaco se divide en 8 o 16 imágenes sincronizadas con la onda R del ECG. ¿Cuántos intervalos tiene este gatillado, y por qué la caja se ubica sobre la suma de todos ellos y no sobre un intervalo solo?'},
   {l:'133',q:'La adquisición gatillada rechaza los latidos cuyo intervalo R-R se sale de una tolerancia. ¿Qué le pasaría a la curva de volumen si el paciente tuviera muchos latidos irregulares durante el examen?'}]:[
   {l:'27, 67 y 73',q:`El MIBI se elimina en un 60 % por vía hepatobiliar y en un 30 % por vía renal. ¿Qué actividad extracardiaca se ve cerca del corazón en esta caja, y cómo puede afectar la pared inferior? ¿Qué recomienda la clase para reducirla?${rep()?' En el reposo, relaciónenlo con la falla de máscara que marcó el equipo.':''}`}],
  reo:()=>gat()?[
   {l:'3 y 66',q:'¿Por qué el eje del gatillado debería quedar parecido al del estudio estático de la misma fase? ¿Qué cambiaría en el movimiento y en el engrosamiento de la pared si quedara torcido?'}]:[
   {l:'76',q:'La clase muestra un ejemplo de mala y de buena reorientación. Con el eje en 0° y 0°, ¿cómo se ven el eje corto y los ejes largos? ¿Qué criterios permitieron decidir que el eje quedó bien?'},
   {l:'77',q:'El paso 3 del procesado es la correspondencia de cortes entre esfuerzo y reposo. ¿Qué ángulos quedaron en cada fase? Si quedaran muy distintos, ¿qué le pasaría al mapa de reversibilidad?'}],
  pantallas7:()=>[
   {l:'98',q:'La clase dice que la ventana Splash sirve para el análisis visual de todos los cortes y para verificar el puntaje automático. En la Splash sin atenuación, ¿dónde se ve el defecto en el estrés, y qué pasa con él en el reposo?'},
   {l:'99–100',q:'¿Qué son el SSS, el SRS y el SDS según la clase, y cuánto valen en este caso sin atenuación? ¿Qué indica el SDS sobre la reversibilidad del defecto?'},
   {l:'103',q:'La clase marca como posible riesgo vital un SDS mayor que 12 o una extensión mayor que 30 %. ¿Cumple este caso alguno de esos criterios, con y sin atenuación? ¿Por qué no conviene usar la pantalla con atenuación del reposo para decidirlo?'}],
  qps:()=>[
   {l:'85–88',q:'Según los patrones de la clase (reversible, fijo, parcialmente reversible y reversibilidad paradójica), ¿cómo se clasifica el defecto de este caso? Para justificar, usar la extensión en estrés y en reposo y el mapa de reversibilidad.'},
   {l:'80–82',q:'La clase indica que el mapa polar permite señalar la arteria coronaria afectada según la pared. ¿Qué segmentos están alterados en el estrés, y a qué territorio coronario corresponden?'},
   {l:'75 y 84',q:'En un hombre, la atenuación diafragmática puede simular un defecto inferior. Comparando el mapa con y sin atenuación, ¿el defecto de este caso se explica por atenuación? ¿Por qué el informe no usó las imágenes con atenuación?'}],
  qgs7:()=>[
   {l:'143',q:'La clase da como límite inferior normal de la fracción de eyección del ventrículo izquierdo alrededor de 50 %. ¿Cuánto vale en estrés y en reposo en este caso, y qué se concluye?'},
   {l:'105',q:'La ventana QGS muestra la curva de volumen y de llenado. ¿En qué intervalo ocurre el fin de sístole, y cómo se relaciona con el volumen de fin de sístole de la tabla?'},
   {l:'3 y 75',q:'El estudio gatillado agrega el movimiento y el engrosamiento de la pared. ¿Cómo ayudan a distinguir un defecto fijo por infarto de uno por atenuación? ¿Qué muestran en la pared inferolateral de este caso?'}]};

 // Caso 8: defecto fijo (necrosis) con estres farmacologico con adenosina y protocolo de dos dias.
 const P8={
  qc:()=>[
   rep()?{l:'41–49 y 71',q:'En el reposo, ¿la corrección automática encontró saltos? Este caso se hizo con estrés farmacológico con adenosina. ¿Es esperable aquí el desplazamiento del corazón que describe la clase después del ejercicio? ¿Por qué?'}
        :{l:'71–72',q:'La clase indica que el movimiento del paciente es la causa más común de artefactos en SPECT y que se controla con el cine y el sinograma. En este estudio, ¿en qué pasos del giro aparecen los saltos, cómo se ven en el sinograma y en el linograma, y qué pasaría con el mapa polar si no se corrigieran?'},
   {l:'67 y 73',q:'Las proyecciones muestran mucha actividad bajo el diafragma. La clase indica que en el esfuerzo farmacológico hay más actividad extracardiaca y recomienda esperar al menos 30 minutos y dar una colación grasa antes de adquirir. ¿Por qué ocurre esto con adenosina, y cómo puede afectar la pared inferior?'}],
  reg:()=>[
   {l:'75 y 84',q:'La clase advierte que en hombres la atenuación diafragmática puede simular un defecto de la pared inferior. En este caso hay un defecto inferior e inferolateral. ¿Qué papel cumple el CT registrado para decidir si es atenuación o un defecto real?'},
   {l:'60',q:'Este estudio se hizo con protocolo de dos días, con un CT en cada fase. ¿Por qué cada fase necesita su propio CT registrado, y qué pasaría si se usara el CT del otro día?'}],
  caja:()=>gat()?[
   {l:'66',q:`La clase indica que el ciclo cardíaco se divide en 8 o 16 imágenes sincronizadas con la onda R. En el estrés con adenosina la frecuencia fue cercana a 100 latidos por minuto y en el reposo, a 87. ¿Cuánto dura cada intervalo en cada fase, y por qué la caja se ubica sobre la suma de los 8?`},
   {l:'133',q:'La adquisición gatillada rechaza los latidos que se salen de una tolerancia del intervalo R-R. En este caso el equipo ubicó el fin de diástole en el último intervalo, el 8, y no en el primero. ¿Qué puede explicarlo, y qué consecuencia tiene para la curva de volumen?'}]:[
   {l:'27, 67 y 73',q:'El MIBI se elimina en un 60 % por vía hepatobiliar y en un 30 % por vía renal. ¿Qué actividad extracardiaca se ve cerca del corazón en esta caja, y cómo puede afectar la pared inferior? ¿Qué recomienda la clase en el esfuerzo farmacológico para reducirla?'}],
  reo:()=>gat()?[
   {l:'3 y 66',q:'¿Por qué el eje del gatillado debería quedar parecido al del estudio estático de la misma fase? ¿Qué cambiaría en el movimiento y en el engrosamiento de la pared si quedara torcido?'}]:[
   {l:'76',q:'La clase muestra un ejemplo de mala y de buena reorientación. Con el eje en 0° y 0°, ¿cómo se ven el eje corto y los ejes largos? ¿Qué criterios permitieron decidir que el eje quedó bien?'},
   {l:'76–77',q:'En este caso falta captación en una parte grande de la pared inferior e inferolateral. ¿Qué dificultad agrega un defecto extenso para ubicar el centro y el eje del ventrículo, y cómo la resolvieron?'}],
  pantallas7:()=>[
   {l:'98',q:'En la Splash sin atenuación, ¿dónde se ve el defecto en el estrés, y qué pasa con él en el reposo?'},
   {l:'99–100',q:'¿Cuánto valen el SSS, el SRS y el SDS en este caso, con y sin atenuación? ¿Qué indica un SDS bajo junto a un SSS alto?'},
   {l:'103',q:'La clase marca como posible riesgo vital un SDS mayor que 12 o una extensión mayor que 30 %. ¿Cumple este caso alguno de esos criterios, con y sin atenuación? En este caso, ¿qué pesa más: la extensión del defecto o su reversibilidad?'}],
  qps:()=>[
   {l:'85–88',q:'Según los patrones de la clase (reversible, fijo, parcialmente reversible y reversibilidad paradójica), ¿cómo se clasifica el defecto de este caso? Para justificar, usar la extensión en estrés y en reposo y el mapa de reversibilidad.'},
   {l:'80–82',q:'¿Qué paredes y segmentos están alterados, y a qué territorios coronarios corresponden? ¿Cómo se relaciona con el antecedente de cirugía de revascularización?'},
   {l:'68, 109 y 120',q:'La clase indica que el MIBI por sí solo no permite evaluar la viabilidad: para eso se agregan nitritos en el reposo o se hace un PET con 18F-FDG. En este defecto fijo, ¿qué estudio ayudaría a decidir si queda miocardio viable, y qué patrón indicaría viabilidad?'}],
  qgs7:()=>[
   {l:'143',q:'La clase da como límite inferior normal de la fracción de eyección del ventrículo izquierdo alrededor de 50 %. ¿Cuánto vale en estrés y en reposo en este caso, y qué se concluye?'},
   {l:'105',q:'La ventana QGS muestra la curva de volumen y de llenado. ¿Qué diferencia hay entre el llenado del estrés y el del reposo (PFR y TTPF), considerando la frecuencia cardíaca de cada fase?'},
   {l:'3 y 75',q:'El informe describe hipocinesia marcada inferolateral. ¿Qué muestran el movimiento y el engrosamiento en esa pared, y cómo apoyan que el defecto fijo sea necrosis y no atenuación?'}]};
 const P=()=>window.Caso7&&Caso7.caso&&Caso7.caso.num===8?P8:P7;
 const NOMBRE={qc:'Control de calidad',reg:'Registro',caja:'Caja',reo:'Orientación de los ejes',pantallas7:'Pantallas finales',qps:'Mapa polar',qgs7:'Mapa QGS'};
 let D=null;
 function dialogo(){
  if(D)return D;D=document.createElement('dialog');D.id='dPreguntas';D.className='saberMasDlg';
  D.innerHTML='<h2 id="pqTitulo">Preguntas</h2><p class="clave">Preguntas de la clase «Exploraciones de MN en Cardiología» (CT13, U-Cursos), aplicadas a lo que se ve en este paso del simulador. Cada una indica de qué lámina viene.</p><ol id="pqLista" class="preguntasLista"></ol><button type="button" class="boton" id="pqCerrar">Cerrar</button>';
  document.body.append(D);$('pqCerrar').addEventListener('click',()=>D.close());D.addEventListener('click',e=>{if(e.target===D)D.close();});return D;
 }
 function abrir(id){
  const d=dialogo(),lista=(P()[id]||(()=>[]))(),paso=document.querySelector('.paso7.actual');
  $('pqTitulo').textContent=`Preguntas · ${paso?paso.textContent:NOMBRE[id]||''}${window.Caso7&&Caso7.activo&&!['pantallas7','qps','qgs7'].includes(id)?` (${rep()?'reposo':'estrés'})`:''}`;
  const ol=$('pqLista');ol.replaceChildren(...lista.map(x=>{const li=document.createElement('li'),p=document.createElement('p'),s=document.createElement('span');p.textContent=x.q;s.className='mono';s.textContent=`Clase CT13, lámina${/[–y,]/.test(x.l)?'s':''} ${x.l}`;li.append(p,s);return li;}));
  d.showModal();d.scrollTop=0;
 }
 // Boton junto a «Saber más», arriba de cada etapa; solo en el caso 7.
 for(const id of Object.keys(P7)){
  const s=$(id);if(!s)continue;const sm=s.querySelector(':scope > .saberMas'),w=document.createElement('div');w.className='ayudaPaso';
  const b=document.createElement('button');b.type='button';b.className='preguntasBtn solo7';b.textContent='Preguntas';b.setAttribute('aria-label','Preguntas de la clase para esta etapa');b.addEventListener('click',()=>abrir(id));
  if(sm){s.insertBefore(w,sm);w.append(sm,b);}else{s.insertBefore(w,s.firstChild);w.append(b);}
 }
 return {abrir,PREGUNTAS:{7:P7,8:P8}};
})();
window.Preguntas7=Preguntas7;
