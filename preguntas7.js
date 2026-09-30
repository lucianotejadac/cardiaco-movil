/* Casos 7 (isquemia reversible) y 8 (estudio normal): botón «Preguntas» en cada etapa del recorrido. Regla: ninguna pregunta pide señalar algo en la
   Splash ni se refiere a una imagen sin una coordenada precisa (paso, píxeles, ángulo, intervalo, segmento o valor). Pocas preguntas por etapa, tomadas de la
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
   rep()?{l:'71–72',q:'En el reposo, ¿la corrección automática encontró saltos? La clase describe que, al terminar un esfuerzo, el corazón puede cambiar de posición por el aumento del volumen pulmonar. ¿Qué fase de este caso es más propensa a ese desplazamiento, y cuántos saltos informó la corrección en cada una?'}
        :{l:'71–72',q:'La clase indica que el movimiento del paciente es la causa más común de artefactos en SPECT y que se controla con el cine y el sinograma. En este estudio, ¿en qué pasos del giro aparecen los saltos, de cuántos píxeles son y hacia dónde, y qué pasaría con el mapa polar si no se corrigieran?'},
   {l:'64–65',q:'El resumen del control de calidad informa el número de vistas y el arco del giro. Con dos cabezales a 90°, ¿cuánto gira cada cabezal y cada cuántos grados se adquiere una vista? ¿Coincide con los parámetros de adquisición de la clase: 32 a 64 imágenes, cada 3 a 6°?'}],
  reg:()=>[
   {l:'75 y 84',q:'La clase describe la atenuación diafragmática, que en hombres puede simular un defecto de la pared inferior, y la mamaria, que en mujeres afecta la pared anterior y septal. En este paciente, ¿qué pared se espera más atenuada, y cómo se usa el CT registrado para corregirla?'},
   {l:'70',q:'Si el CT quedara corrido unos milímetros respecto de la emisión, ¿qué error aparecería en la reconstrucción con atenuación, y en qué zona del corazón se notaría más?'}],
  caja:()=>gat()?[
   {l:'66',q:'La clase indica que el ciclo cardíaco se divide en 8 o 16 imágenes sincronizadas con la onda R del ECG. ¿Cuántos intervalos tiene este gatillado, y por qué la caja se ubica sobre la suma de todos ellos y no sobre un intervalo solo?'},
   {l:'133',q:'La adquisición gatillada rechaza los latidos cuyo intervalo R-R se sale de una tolerancia. ¿Qué le pasaría a la curva de volumen si el paciente tuviera muchos latidos irregulares durante el examen?'}]:[
   {l:'27, 67 y 73',q:`El MIBI se elimina en un 60 % por vía hepatobiliar y en un 30 % por vía renal. ¿Qué órganos pueden sumar actividad junto a la pared inferior del corazón, cómo puede afectarla, y qué recomienda la clase para reducirla?${rep()?' En el reposo, relaciónenlo con la falla de máscara que marcó el equipo (QC 4,47).':''}`}],
  reo:()=>gat()?[
   {l:'3 y 66',q:'¿Por qué el eje del gatillado debería quedar parecido al del estudio estático de la misma fase? ¿Qué cambiaría en el movimiento y en el engrosamiento de la pared si quedara torcido?'}]:[
   {l:'76',q:'La clase muestra un ejemplo de mala y de buena reorientación. ¿Con qué azimut y elevación quedó tu eje, cuántos grados lo giraste desde 0° y 0°, y qué criterios de la clase usaste para decidir que quedó bien?'},
   {l:'77',q:'El paso 3 del procesado es la correspondencia de cortes entre esfuerzo y reposo. ¿Qué ángulos quedaron en cada fase? Si quedaran muy distintos, ¿qué le pasaría al mapa de reversibilidad?'}],
  pantallas7:()=>[
   {l:'99–100',q:'¿Qué son el SSS, el SRS y el SDS según la clase, y cuánto valen en este caso sin atenuación? ¿Qué indica el SDS sobre la reversibilidad del defecto?'},
   {l:'103',q:'La clase marca como posible riesgo vital un SDS mayor que 12 o una extensión mayor que 30 %. ¿Cumple este caso alguno de esos criterios, con y sin atenuación? ¿Por qué no conviene usar la pantalla con atenuación del reposo para decidirlo?'}],
  qps:()=>[
   {l:'85–88',q:'Según los patrones de la clase (reversible, fijo, parcialmente reversible y reversibilidad paradójica), ¿cómo se clasifica el defecto de este caso? Para justificar, usar la extensión en estrés y en reposo y el porcentaje de reversibilidad que informa la pantalla QPS.'},
   {l:'80–82',q:'La clase indica que el mapa polar permite señalar la arteria coronaria afectada según la pared. ¿Qué segmentos están alterados en el estrés, y a qué territorio coronario corresponden?'},
   {l:'75 y 84',q:'En un hombre, la atenuación diafragmática puede simular un defecto inferior. Comparando la extensión y los puntajes con y sin atenuación, ¿el defecto de este caso se explica por atenuación? ¿Por qué el informe no usó las imágenes con atenuación?'}],
  qgs7:()=>[
   {l:'143',q:'La clase da como límite inferior normal de la fracción de eyección del ventrículo izquierdo alrededor de 50 %. ¿Cuánto vale en estrés y en reposo en este caso, y qué se concluye?'},
   {l:'105',q:'La ventana QGS muestra la curva de volumen y de llenado. ¿En qué intervalo ocurre el fin de sístole, y cómo se relaciona con el volumen de fin de sístole de la tabla?'},
   {l:'3 y 75',q:'El estudio gatillado agrega el movimiento y el engrosamiento de la pared. ¿Cómo ayudan a distinguir un defecto fijo por infarto de uno por atenuación? ¿Qué valores de movimiento y de engrosamiento tienen los segmentos basal y medio inferolateral de este caso?'}]};

 // Caso 8: estudio normal, estres farmacologico con adenosina en dias distintos, bloqueo de rama derecha y extrasistoles.
 const P8={
  qc:()=>[
   rep()?{l:'41–49 y 71',q:'En el reposo, ¿cuántos saltos informó la corrección automática? Este caso se hizo con adenosina: ¿es esperable aquí el desplazamiento del corazón que describe la clase después del ejercicio? ¿Por qué?'}
        :{l:'71–72',q:'La clase indica que el movimiento del paciente es la causa más común de artefactos en SPECT y que se controla con el cine y el sinograma. En este estudio, ¿en qué pasos del giro aparecen los saltos, de cuántos píxeles son y hacia dónde, y qué pasaría con el mapa polar si no se corrigieran?'},
   {l:'38 y 41–47',q:'Según los antecedentes, la frecuencia cardíaca llegó a 76 lpm, el 56 % de la predicha para la edad (135 lpm). La clase pide alcanzar el 85 % de la frecuencia máxima teórica en el esfuerzo físico. ¿Se aplica ese criterio a este estudio con adenosina? ¿Por qué?'}],
  reg:()=>[
   {l:'75 y 84',q:'El paciente es hombre: ¿qué pared se espera más atenuada por el diafragma? Comparando la extensión y la suma de puntajes del estrés sin atenuación y con atenuación de este caso, ¿qué indica la diferencia?'},
   {l:'60',q:'El estrés y el reposo se adquirieron en días distintos, con un CT en cada día. ¿Por qué cada fase necesita su propio CT registrado, y qué pasaría si se usara el CT del otro día?'}],
  caja:()=>gat()?[
   {l:'133',q:'El ECG muestra extrasístoles ventriculares aisladas. La clase indica una tolerancia de 10 a 15 % para el intervalo R-R. ¿Qué pasa con esos latidos en la adquisición gatillada, y qué efecto tendrían muchas extrasístoles en la curva de volumen?'},
   {l:'66',q:'El estrés se adquirió a 60 latidos por minuto (R-R de 994 ms) y el ciclo se divide en 8 intervalos. ¿Cuánto dura cada intervalo, y por qué la caja se ubica sobre la suma de los 8?'}]:[
   {l:'27, 67 y 73',q:'Con adenosina hay más actividad hepatobiliar e intestinal que con ejercicio. ¿Qué órganos pueden sumar actividad junto a la pared inferior del corazón, cómo puede afectarla, y qué recomienda la clase en el esfuerzo farmacológico para reducirla?'}],
  reo:()=>gat()?[
   {l:'3 y 66',q:'¿Por qué el eje del gatillado debería quedar parecido al del estudio estático de la misma fase? ¿Qué cambiaría en el movimiento y en el engrosamiento de la pared si quedara torcido?'}]:[
   {l:'76',q:'La clase muestra un ejemplo de mala y de buena reorientación. ¿Con qué azimut y elevación quedó tu eje, cuántos grados lo giraste desde 0° y 0°, y qué criterios de la clase usaste para decidir que quedó bien?'},
   {l:'77',q:'El paso 3 del procesado es la correspondencia de cortes entre esfuerzo y reposo. ¿Qué ángulos quedaron en cada fase? Si quedaran muy distintos, ¿podría aparecer un defecto o una reversibilidad que no existe? ¿Por qué?'}],
  pantallas7:()=>[
   {l:'99–100',q:'¿Cuánto valen el SSS, el SRS y el SDS en este caso, con y sin atenuación? Con los rangos que explica la «Pantalla final tutorial», ¿qué sugeriría cada juego de valores por sí solo, y cuál es más confiable en este paciente?'},
   {l:'103',q:'La clase marca como posible riesgo vital un SDS mayor que 12 o una extensión mayor que 30 %. ¿Qué SDS y qué extensión informa el equipo en este caso, con y sin atenuación, y qué se concluye?'}],
  qps:()=>[
   {l:'83–88',q:'La clase describe un estudio normal como una captación homogénea en esfuerzo y en reposo. Con la extensión en estrés y en reposo y el porcentaje de reversibilidad que informa la pantalla QPS, ¿cómo se clasifica este estudio?'},
   {l:'84',q:'Sin atenuación, el estrés puntúa en los segmentos apical anterior, apical septal, ápex y basal inferoseptal. ¿Qué puntaje tiene cada uno con atenuación? ¿Qué sugiere que bajen o desaparezcan al corregir la atenuación?'},
   {l:'34',q:'La clase lista el bloqueo de rama izquierda entre las contraindicaciones de la prueba de esfuerzo. Este paciente tiene bloqueo de rama derecha y se estudió con adenosina. ¿Qué puntajes tienen los segmentos septales (anteroseptales e inferoseptales) de este caso con atenuación?'}],
  qgs7:()=>[
   {l:'143',q:'La clase da como límite inferior normal de la fracción de eyección alrededor de 50 %, y el informe usa más de 42 %. ¿Cuánto vale la fracción de eyección en estrés y en reposo, y qué se concluye con cada límite?'},
   {l:'105',q:'¿En qué intervalo ocurren el fin de diástole y el fin de sístole en cada fase, y cómo se relacionan con los volúmenes de fin de diástole y de sístole de la tabla?'},
   {l:'3 y 75',q:'En un estudio normal todos los segmentos se mueven y engruesan. ¿Qué segmento tiene el menor engrosamiento en el estrés, cuánto vale, y cuánto se mueve ese mismo segmento?'}]};
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
