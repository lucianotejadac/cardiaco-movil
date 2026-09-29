/* Caso 7: botón «Preguntas» en cada etapa del recorrido. Pocas preguntas por etapa, tomadas de la
   clase «CT13. Exploraciones de MN en Cardiología» del curso (U-Cursos, TM08315) y aplicadas a lo
   que se ve en ese paso del simulador. Cada pregunta dice de qué lámina viene. No trae respuestas:
   las respuestas son parte de la evaluación del estudiante. */
'use strict';
const Preguntas7=(()=>{
 const $=id=>document.getElementById(id);
 const est=()=>window.Caso7?Caso7.estado:{},rep=()=>est().fase==='reposo',gat=()=>est().sub==='gat';
 // Por seccion: lista de {l: laminas de la clase, q: texto (o funcion segun la fase y el paso)}.
 const P={
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
 const NOMBRE={qc:'Control de calidad',reg:'Registro',caja:'Caja',reo:'Orientación de los ejes',pantallas7:'Pantallas finales',qps:'Mapa polar',qgs7:'Mapa QGS'};
 let D=null;
 function dialogo(){
  if(D)return D;D=document.createElement('dialog');D.id='dPreguntas';D.className='saberMasDlg';
  D.innerHTML='<h2 id="pqTitulo">Preguntas</h2><p class="clave">Preguntas de la clase «Exploraciones de MN en Cardiología» (CT13, U-Cursos), aplicadas a lo que se ve en este paso del simulador. Cada una indica de qué lámina viene.</p><ol id="pqLista" class="preguntasLista"></ol><button type="button" class="boton" id="pqCerrar">Cerrar</button>';
  document.body.append(D);$('pqCerrar').addEventListener('click',()=>D.close());D.addEventListener('click',e=>{if(e.target===D)D.close();});return D;
 }
 function abrir(id){
  const d=dialogo(),lista=(P[id]||(()=>[]))(),paso=document.querySelector('.paso7.actual');
  $('pqTitulo').textContent=`Preguntas · ${paso?paso.textContent:NOMBRE[id]||''}${window.Caso7&&Caso7.activo&&!['pantallas7','qps','qgs7'].includes(id)?` (${rep()?'reposo':'estrés'})`:''}`;
  const ol=$('pqLista');ol.replaceChildren(...lista.map(x=>{const li=document.createElement('li'),p=document.createElement('p'),s=document.createElement('span');p.textContent=x.q;s.className='mono';s.textContent=`Clase CT13, lámina${/[–y,]/.test(x.l)?'s':''} ${x.l}`;li.append(p,s);return li;}));
  d.showModal();d.scrollTop=0;
 }
 // Boton junto a «Saber más», arriba de cada etapa; solo en el caso 7.
 for(const id of Object.keys(P)){
  const s=$(id);if(!s)continue;const sm=s.querySelector(':scope > .saberMas'),w=document.createElement('div');w.className='ayudaPaso';
  const b=document.createElement('button');b.type='button';b.className='preguntasBtn solo7';b.textContent='Preguntas';b.setAttribute('aria-label','Preguntas de la clase para esta etapa');b.addEventListener('click',()=>abrir(id));
  if(sm){s.insertBefore(w,sm);w.append(sm,b);}else{s.insertBefore(w,s.firstChild);w.append(b);}
 }
 return {abrir,PREGUNTAS:P};
})();
window.Preguntas7=Preguntas7;
