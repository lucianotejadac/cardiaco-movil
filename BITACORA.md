# Bitácora de decisiones · Cardíaco móvil

Registro al estilo ADR: contexto, decisión, alternativas descartadas y validación de cada ronda.

## 2026-09-27 · Paso 1: cargar la cruda de estrés del caso 1 y ver el control de calidad

Participantes: Luciano Tejada (docente) y Claude (Claude Code).

**Contexto.** El tutorial cardíaco de `spect-lab-95` está pensado para escritorio (interfaz Windows 95, paneles laterales) y no se puede usar en un teléfono. El docente pidió una versión compatible con teléfonos, construida paso a paso, con estas decisiones para el primer paso: repositorio nuevo; el estudiante usa el ZIP que ya está en U-Cursos; solo estrés; las cuatro imágenes del control de calidad (cine, sinograma, linograma, suma); sin tutorial; caso 1 fijo; Android con Chrome como objetivo.

**Decisiones.**
- **Repositorio propio** (`cardiaco-movil`) en vez de una variante de `spect-lab-95`: la interfaz de escritorio no se adapta y el móvil necesita otra disposición, pero el motor sí se comparte: `simulador95-engine.js` y `dicomParser` se copian tal cual, y `cardiaco-casos.js` es el mismo manifiesto de los otros dos repos.
- **La aplicación abre el ZIP de la entrega** (27 a 36 MB) y extrae solo `NM_estres.dcm` (4,2 MB comprimido a 0,9 MB). Se escribió un lector ZIP mínimo (fin de directorio central, entradas, cabecera local) que descomprime con `DecompressionStream('deflate-raw')`, disponible en Chrome de Android. Descartado: pedir al estudiante que descomprima en el teléfono, o subir a U-Cursos archivos nuevos. Si el navegador no tiene `DecompressionStream`, el mensaje pide elegir el DICOM suelto.
- **Comprobación por marco de referencia**: el archivo se acepta si `cardiacoHash(FrameOfReferenceUID)` coincide con el marco del estrés del caso 1 en el manifiesto; si no, se muestra igual con un aviso, porque este paso no tiene tutorial que bloquee.
- **Las cuatro imágenes con la misma lógica del bloque de escritorio** (`refrescarQc`, `dibujarSino`, `dibujarCine`): 64 vistas de fotopico ordenadas por ángulo, fila del sinograma por omisión en el máximo de la imagen suma, medida de movimiento axial por corrimiento entero del perfil entre vistas vecinas. Se agregó una línea amarilla sobre la imagen suma que marca la fila elegida, porque en un teléfono no hay espacio para explicar con texto qué fila se está mirando.
- **Disposición**: una columna, tarjetas, lienzos al ancho de la pantalla con `image-rendering: pixelated`, deslizadores de 44 px de alto y pulgar de 28 px para el dedo, sin desplazamiento horizontal.

**Validación.** Prueba sin interfaz con `cdp_run.cjs --movil` (emulación de 390 × 844, dpr 3, táctil) cargando el ZIP real «Cardiaco Juan.zip»: 27,1 MB leídos y la cruda extraída y parseada en 0,6 s; 64 vistas, 4,52 M cuentas, 71 k por vista; los cuatro lienzos pintados; el deslizador de fila redibuja el sinograma; el cine avanza al reproducir; ancho de página igual al del dispositivo.

**Pendiente.** Los pasos siguientes (reposo, preguntas de control de calidad, CT, reconstrucción) se decidirán uno por uno con el docente. Probar en un teléfono Android real, además de la emulación.

## 2026-09-27 · La zona negra del sinograma: truncación por los cabezales en L

**Contexto.** El docente marcó en el sinograma del caso 1 una zona negra de borde curvo con un escalón vertical en el medio y pidió averiguar qué era. La primera explicación (aire fuera del paciente) era una hipótesis sin comprobar y resultó falsa.

**Hallazgo.** Son columnas completas con cero cuentas exactas en el borde de cada proyección. Medidas en el DICOM, el ancho de la franja de un cabezal crece un milímetro por cada milímetro que se aleja el otro: pendiente 0,99 y correlación 1,000 en el estrés del caso 1 (cabezal 1 frente al radio del cabezal 2, de 30 a 122 mm), y lo mismo en el reposo del caso 1 y el estrés del caso 2. Los cabezales van en L, unidos por la esquina, con órbita de contorno corporal: al alejarse uno arrastra lateralmente al otro, el equipo guarda la imagen centrada en el eje de rotación y rellena con ceros lo que quedó fuera del cristal. El escalón vertical es el cambio de cabezal (vista 32 a 33).

**Decisión.** Nota fija bajo el sinograma que lo explica y una línea calculada sobre el archivo cargado: cuántas vistas tienen columnas en cero y el ancho máximo en columnas y milímetros. El mismo texto se corrigió en el tutorial de escritorio de `spect-lab-95`.

**Pendiente.** La OSEM de `spect-lab-95` trata esos píxeles como ceros medidos y no como dato ausente; excluirlos del cálculo cambiaría la periferia de la reconstrucción y obliga a revalidar los seis casos. No se tocó.

## 2026-09-27 · Leyendas que no dan nada por sabido

**Contexto.** El docente pidió leyendas más explicativas: las primeras asumían que el estudiante ya sabía qué es una proyección, una cuenta, un cabezal o por qué un sinograma se curva.

**Decisión.** Cada imagen lleva una leyenda con la misma estructura: qué es (cómo se construye a partir de las proyecciones), qué significa cada eje, cómo leerla y qué buscar. Antes de las imágenes se explica qué es una proyección y por qué se revisan antes de reconstruir. La zona sin medición del sinograma se explica en cuatro pasos y se enseña a distinguirla del aire fuera del paciente (oscuro granulado frente a negro absoluto). Las líneas de datos dicen en palabras lo que antes decían en abreviaturas: «cuenta» se define, la medida de movimiento explica cómo se calcula y advierte que es una ayuda y no un veredicto, y la franja se da en píxeles y en milímetros respecto del ancho total. Decimales con coma. Se comprobó en la cabecera que arriba de la imagen es hacia la cabeza (segundo vector de orientación 0, 0, −1) antes de escribirlo.

## 2026-09-27 · Cuatro imágenes en una pantalla, conectadas por dos cursores

**Contexto.** Con una imagen debajo de la otra había que desplazarse para relacionarlas, y las leyendas largas ocupaban la pantalla. El docente pidió conectar todos los controles, que la línea amarilla se note en las otras imágenes al reproducir o al navegar el sinograma, ver las cuatro en la misma pantalla y dejar las explicaciones en botones «Ver más».

**Decisiones.**
- **Rejilla de 2 × 2** (cine y suma arriba, sinograma y linograma abajo) con los controles debajo. En un teléfono de 390 × 740 útiles cada imagen mide 181 px y los controles terminan en y = 664: todo cabe sin desplazarse. La tarjeta de carga se oculta al cargar y queda un botón «Cambiar archivo» en la barra.
- **Dos cursores compartidos.** La fila (línea amarilla horizontal) se dibuja en el cine, la suma y el linograma, y es la fila con que se arma el sinograma. La vista (línea celeste vertical) se dibuja en el sinograma y el linograma y es la que muestra el cine; al reproducir, avanza. Dos colores porque son dos variables distintas: con una sola línea amarilla no se distinguiría qué se está moviendo. Los pulgares de los deslizadores llevan el color de su cursor.
- **Las imágenes son controles.** Tocar o arrastrar sobre el cine o la suma mueve la fila; sobre el sinograma, la vista; sobre el linograma, las dos. Así se puede tocar un quiebre del sinograma y ver esa vista en el cine.
- **Explicaciones en diálogos.** Cada imagen tiene su «Ver más», y hay uno general sobre las proyecciones y sobre cómo se conectan las imágenes. Las líneas de datos detalladas (cuentas, franja, medida de movimiento) viven dentro del diálogo que les corresponde; a la vista queda un resumen de una línea.

**Validación.** Prueba en emulación de teléfono con el ZIP real: las cuatro imágenes y los controles dentro de la pantalla; la línea amarilla aparece en cine, suma y linograma al cambiar la fila; la celeste aparece en sinograma y linograma al reproducir y el deslizador la sigue; tocar el sinograma en el medio lleva el cine a la vista 33; tocar la suma y el linograma mueve los cursores; los cinco «Ver más» abren y cierran; ninguna explicación larga visible antes de pedirla.

## 2026-09-27 · Vista corregido: dos columnas, sin corregir y corregido

**Contexto.** El docente fijó que la carga será siempre desde el ZIP y pidió un botón «Vista corregido» que muestre dos columnas: a la izquierda lo que salió del equipo sin corregir y a la derecha la copia corregida; primera fila las proyecciones, segunda el sinograma y, bajando por la página, la imagen suma y el linograma.

**Decisiones.**
- **El ZIP entrega las dos adquisiciones.** Además de `NM_estres.dcm` se extrae `NM_estres_QC_corregido.dcm` de la misma carpeta. Se acepta solo si comparte marco de referencia y matriz con la cruda. Si el ZIP no la trae, el botón queda deshabilitado.
- **La rejilla se arma según la vista.** En una columna, las cuatro imágenes de la cruda en una pantalla. En dos columnas, ocho imágenes en el orden pedido, con los rótulos «Sin corregir» y «Corregido» y un «Ver más» por fila.
- **Misma escala de color en las dos columnas.** La corregida se pinta con los máximos de la cruda (cine, suma, linograma y sinograma de la fila): una diferencia de brillo entre columnas es una diferencia de cuentas, no de ventana.
- **Los cursores van juntos.** Fila y vista se mueven a la vez en las dos columnas, así siempre se compara lo mismo.
- **Controles pegados abajo** en la vista de dos columnas, porque la página se desplaza y sin eso habría que subir para reproducir o cambiar la fila. En esta vista las imágenes dejan pasar el arrastre vertical para desplazar la página; se siguen pudiendo tocar.
- **La comparación se mide, no se supone.** Vista por vista se comprueba si las cuentas son idénticas y, si no, el desplazamiento entero que mejor hace calzar los perfiles a lo largo de la camilla y hacia el lado. El resultado va en el resumen y en «Ver más sobre la comparación».

**Hallazgo.** En el estrés del caso 1 la copia corregida es idéntica a la original, píxel por píxel, en las 64 vistas: las dos columnas se ven iguales y la aplicación lo dice. En el caso 4 (ZIP de prueba) difieren 62 de 64 vistas, con hasta 2 píxeles hacia el lado y menos de un píxel a lo largo de la camilla.

**Validación.** Emulación de teléfono con dos ZIP reales: orden de las ocho imágenes, columnas rotuladas, sin corregir a la izquierda, proyecciones y sinograma visibles sobre los controles, suma y linograma bajo el pliegue y visibles al bajar, controles siempre a la vista, cursores presentes en las dos columnas.

## 2026-09-27 · Entrega modificada: movimiento simulado en el estrés

**Contexto.** En el caso 1 la copia corregida del equipo es idéntica a la original, así que la vista de dos columnas no mostraba ninguna diferencia. El docente pidió modificar las proyecciones sin corregir para que tengan un par de saltos coherentes, asumiendo que eso cambia los ZIP, y trabajar sobre una copia local con los mismos nombres.

**Decisiones** (confirmadas por el docente antes de empezar).
- **Copia completa** en `Downloads\CARDIACOS\ENTREGA CARDIACO MODIFICADA`; la entrega original queda intacta y es la que sigue en U-Cursos.
- **Los cinco casos**, solo la fase de estrés: `NM_estres.dcm` y, para ser coherente con el mismo giro, `NM_estres_gatillado.dcm`. La copia corregida, el reposo, los CT y las referencias no se tocan. Así la copia corregida pasa a ser la versión sin el movimiento simulado.
- **Dos saltos que se mantienen hasta el final**, como un paciente que se acomoda y no vuelve: uno de 2 píxeles (6,6 mm) a lo largo de la camilla y uno de 2 píxeles de lado a lado. Pasos y sentidos distintos por caso, para que no haya una respuesta única.
- **Coherencia física.** Los dos cabezales adquieren a la vez, así que cada salto afecta a las vistas de ambos desde ese paso del giro y aparece en dos lugares del sinograma. El salto lateral es un desplazamiento del paciente y se proyecta en cada vista según su ángulo (de 0 a 2 píxeles, redondeado a entero para no interpolar cuentas). La franja sin medición pertenece al detector y no se mueve: el corrimiento se hace dentro de la zona medida. Las líneas que entran por el borde se rellenan con cuentas de Poisson a partir de la media de las tres líneas vecinas.
- **Cabecera intacta**: mismos identificadores y marco de referencia, para que los simuladores sigan reconociendo los archivos. Se agregó solo un comentario que dice que los datos incluyen movimiento simulado, sin decir dónde.

**Validación.** Verificación exacta sobre los diez archivos: cada cuadro modificado es el original corrido exactamente lo planificado dentro de la zona medida, ningún cuadro tiene cuentas fuera de ella, las cabeceras son idénticas salvo el comentario y en cada ZIP cambiaron solo dos entradas de las mismas en el mismo orden. En la versión móvil, con el ZIP modificado del caso 1, la comparación informa 46 de 64 vistas distintas, que son las 23 de cada cabezal desde el paso 10.

**Advertencias.** Las validaciones de eje y FEVI de las dos partes de escritorio se hicieron con la cruda original; con la entrega modificada la reconstrucción de estrés lleva movimiento y hay que revalidar antes de publicarla. El caso 3 no trae copia corregida de estrés. La medida automática de movimiento da 3 píxeles en el caso 1 tanto antes como después de agregar los saltos: con pocas cuentas no discrimina.

## 2026-09-27 · Caso 1: saltos más evidentes y sin copia corregida

**Contexto.** Con 2 píxeles el salto del caso 1 se veía poco: el estrés tiene pocas cuentas (9 mCi) y el ruido lo disimula. El docente pidió hacerlo más evidente y quitar la copia corregida del caso 1, porque la corrección la hará la propia aplicación en un paso siguiente.

**Decisión.** En la entrega modificada, el caso 1 lleva saltos de 4 píxeles (13,2 mm): a lo largo de la camilla desde el paso 10 y lateral desde el paso 21. Se regeneró desde la cruda original, no sobre la versión de 2 píxeles. `NM_estres_QC_corregido.dcm` se quitó de la carpeta y del ZIP del caso 1 (80 entradas en vez de 81). Los casos 2 a 5 quedan con 2 píxeles y conservan su copia corregida.

**Validación.** Verificación exacta sin fallas en los diez archivos y los cinco ZIP. En la versión móvil el linograma muestra los escalones a simple vista y la medida automática pasa de 3 a 5 píxeles. Como el ZIP ya no trae copia corregida, el botón «Vista corregido» queda deshabilitado y el resumen lo dice.

**Pendiente.** La corrección de movimiento hecha por la aplicación, que devolverá la columna «Corregido» al caso 1.

## 2026-09-28 · Corrección automática de movimiento hecha por la aplicación

**Contexto.** El caso 1 quedó sin copia corregida del equipo y con dos saltos simulados de 4 píxeles. El docente eligió que la corrección sea automática: la columna «Corregido» de la vista de dos columnas la produce la propia aplicación.

**Decisiones.**
- **El movimiento es una función del paso del giro, no de la vista.** Los dos cabezales adquieren a la vez: un salto del paciente aparece en los dos, en el mismo paso. El algoritmo trabaja con los 32 pasos y usa los dos cabezales juntos.
- **Registro en dos dimensiones entre pasos vecinos.** Para cada cabezal, la vista t se registra contra la t−1 sobre imágenes suavizadas (gaussiana de 1,5 píxeles) y solo en la zona medida común, para que la franja sin medición no engañe. El giro produce entre vecinas un corrimiento lateral suave, que se quita con una mediana móvil de 7 pasos; un salto queda como un pico. Umbral adaptativo: mediana más seis desviaciones robustas, con un mínimo de 1,2 píxeles.
- **A lo largo de la camilla** el pico es el mismo en los dos cabezales y se promedia. El registro entre dos vistas ubica bien el salto pero mide su tamaño con medio píxel de error cuando hay pocas cuentas (dio 3,5 donde había 4), así que el tamaño se afina comparando el perfil a lo largo de la camilla de cinco pasos antes y cinco después, con los dos cabezales juntos.
- **Hacia el lado**, los dos cabezales están a 90° y ven dos proyecciones del mismo desplazamiento: juntas dan el vector en el plano del paciente, cuyo módulo se redondea a píxeles enteros y que después se proyecta en cada vista según su ángulo.
- **La corrección desplaza, no interpola.** Corrimientos enteros, y lo que entra por el borde queda en cero: es «sin dato».
- **Descartado: comparar perfiles de una dimensión contra una referencia global.** Fue el primer prototipo: subestimaba el salto (3 en vez de 4) y en los datos originales inventaba una deriva que no se pudo distinguir del cambio normal del perfil con el ángulo.
- **La copia corregida del equipo ya no se usa**, aunque el ZIP la traiga.
- **Lo que la aplicación informa es lo que encontró**, no la respuesta: cuántos saltos, de cuánto, hacia dónde y desde qué paso.

**Validación.** Primero en un prototipo en Python contra los diez archivos (cinco modificados y cinco originales), después en la aplicación en emulación de teléfono, comparando lo corregido con la cruda original sin movimiento:

| Archivo | Lo que encontró | Vistas que quedan exactas |
|---|---|---|
| Caso 1 con saltos de 4 px | camilla 4 px desde el paso 10; lado 4 px desde el paso 21 (lo simulado) | 60 de 64; las otras 4 con 1 px de error lateral |
| Caso 1 original | nada | 64 de 64 |
| Caso 2 con saltos de 2 px | camilla 2 px desde el paso 11; lado 2 px desde el paso 22 (lo simulado) | 55 de 64; las otras 9 con 1 px |
| Caso 3 con saltos de 2 px | solo el lateral | falla |
| Casos 4 y 5 con saltos de 2 px | nada | falla |

El cálculo toma 0,6 a 1,2 segundos en la emulación. En los cinco originales no inventa movimiento.

**Límites conocidos.** Con saltos de 2 píxeles falla en los casos 3, 4 y 5: en sus datos originales el registro entre vistas vecinas ya oscila entre 1 y 4 píxeles a lo largo de la camilla (ruido, o movimiento real del paciente), y el umbral adaptativo sube hasta tapar un salto de 2. No corrige derivas lentas. Antes de habilitar otros casos hay que decidir si se agrandan sus saltos o se mejora la detección.

## 2026-09-28 · Parte sin corregir; el botón «Corregir» abre las dos columnas

**Contexto.** El docente fijó el recorrido: la aplicación parte mostrando lo sin corregir, ofrece corregir y ahí muestra las dos columnas.

**Decisión.** La vista de una columna lleva el rótulo «Sin corregir» a todo el ancho, sobre las cuatro imágenes. El botón dice «Corregir» mientras no se ha corregido; en las dos columnas dice «Volver a sin corregir», y al volver, «Ver corregido» (la corrección ya calculada no se repite). Se actualizaron los textos que nombraban el botón anterior («Vista corregido»).

**Validación.** Emulación de teléfono con el ZIP del caso 1 con dos saltos de 4 píxeles a lo largo de la camilla (pasos 10 y 21, sin copia corregida): al cargar, botón «Corregir», rótulo «Sin corregir» y cuatro imágenes; al pulsarlo, rótulos «Sin corregir» y «Corregido» y ocho imágenes; volver y entrar de nuevo alterna sin recalcular. La corrección encuentra los dos saltos en su paso y sentido, pero mide 3 píxeles en cada uno en vez de 4: con dos saltos seguidos en el mismo eje subestima. No se tocó el algoritmo.

## 2026-09-28 · El archivo queda guardado en el teléfono

**Contexto.** El docente pidió que la carga persista, para no tener que elegir el ZIP de nuevo cada vez que se publica una versión nueva del simulador.

**Decisión.** Después de leer bien el archivo, la aplicación guarda en IndexedDB, dentro del navegador del teléfono, solo el DICOM que sacó del ZIP (`NM_estres.dcm`, 4,2 MB; no los 27 MB del ZIP) y el nombre de origen. Al abrir la página, si hay algo guardado, se muestra sin pedir nada y el estado dice «guardado en este teléfono». «Cambiar archivo» elige otro y lo reemplaza. Se pide almacenamiento persistente al navegador para que no lo borre por falta de espacio. Si lo guardado no se puede leer (por ejemplo, tras un cambio de formato), se olvida y se vuelve a pedir el ZIP. Si el navegador no deja guardar (modo incógnito), la aplicación funciona igual que antes. Sigue sin enviarse nada a ningún servidor; el texto de privacidad lo explica.

**Validación.** Emulación de teléfono servida por HTTP: primera visita pide el ZIP; al elegirlo se muestra; al recargar se muestra solo, con el aviso de guardado; «Corregir» funciona sobre lo recuperado (los mismos dos saltos); con un dato guardado dañado, la página lo olvida y vuelve a pedir el ZIP, también en la recarga siguiente.

## 2026-09-28 · Paso 2: registro SPECT/CT sobre la FBP

**Contexto.** El docente pidió un botón para pasar al registro con la FBP, en el que el estudiante tenga que calzar el CT.

**Decisiones.**
- **Misma lógica que el tutorial de escritorio de `spect-lab-95`:** FBP con filtro rampa sobre el fotopico, con el mismo worker de `simulador95-engine.js`, y suavizado gaussiano 3D de 8,4 mm. El ejercicio desplaza el CT entre 35 y 70 mm en X y en Y, con signo al azar, y 0 en Z, donde ya comparten origen. Al confirmar, el residuo se juzga igual: hasta 3 mm, dentro de un vóxel; hasta 8 mm, aceptable; más, no calza. En el móvil el registro **solo se acepta hasta 8 mm**, y **no se muestra el desplazamiento** mientras no se confirma, para que haya que calzarlo mirando.
- **Qué se reconstruye:** las proyecciones corregidas por la aplicación si el estudiante pulsó «Corregir»; si no, las sin corregir. El estado lo dice.
- **El CT sale del mismo ZIP:** los cortes de la subcarpeta «CT …» junto a `NM_estres.dcm` (41 cortes de 512 × 512, 21 MB). Se guardan en el teléfono con las proyecciones. Lo guardado antes de este cambio no trae CT; en ese caso el paso pide elegir el ZIP una vez más.
- **Interacción táctil:** se arrastra el CT sobre la fusión (1 mm por cada ~1 px de pantalla en un teléfono de 412 px) y hay flechas de 1 mm que repiten al mantenerlas. En coronal y sagital solo se mueve en horizontal, porque la vertical es Z. El desplazamiento se limita a ±150 mm. Tres planos, corte, mezcla SPECT, umbral y ventana de CT (contorno externo por omisión, tejido blando, hueso). Los cortes iniciales pasan por el máximo de la reconstrucción en el corte de la fila del corazón.
- **La franja sin medición se rellena antes de la FBP.** Sin eso, la FBP mostraba una banda diagonal saturada que salía del cuerpo, igual con el ZIP original que con el modificado. Se comprobó que no era un error de geometría: al reproyectar un corte y correlacionarlo con lo medido, la geometría actual da 0,927 y al invertir cualquiera de los dos cabezales baja a 0,885. La banda venía del salto de cuentas a cero en el borde de la franja, que el filtro rampa vuelve un pico. Solo en esta reconstrucción preliminar, cada fila de la franja se rellena con la media de las tres columnas medidas vecinas, bajando a cero con un coseno. La OSEM de escritorio sigue tratando esos píxeles como ceros medidos (pendiente anotado el 27-09).
- **Umbral de visualización del SPECT** (30 % por omisión): con pocas cuentas, la FBP deja manchas de ruido en todo el campo que tapan el CT; el umbral las oculta y deja ver hígado, corazón e intestino.

**Validación.** Emulación de teléfono (Pixel 7) servida por HTTP, con el ZIP del caso 1 modificado: se extraen y guardan los 41 cortes de CT y se recuperan al recargar; la FBP y el suavizado toman unos 4 s; un arrastre de 100 px mueve el CT 106 mm, lo esperado; confirmar sin mover dice que no calza; a 2 y 1 mm confirma «dentro de un vóxel»; a 6 mm, «aceptable»; mover después de confirmar pide confirmar de nuevo. Con el desfase en cero, el contorno del cuerpo del CT y el hígado y el corazón del SPECT coinciden en los tres planos, dentro de lo que permite una FBP de estrés con pocas cuentas.

**Pendiente.** Probar en un teléfono real el arrastre y el tiempo de la FBP. El registro todavía no alimenta un mapa de atenuación ni una OSEM: son los pasos siguientes.

## 2026-09-28 · Nivel y ancho de ventana del SPECT en el registro

**Contexto.** El docente pidió poder modificar el nivel y el ancho de la ventana del SPECT en la fusión.

**Decisión.** El umbral se reemplaza por dos deslizadores, **nivel** (0 a 150 %) y **ancho** (1 a 200 %), en porcentaje del percentil 99,5 de la reconstrucción, con la misma fórmula del escritorio: `(valor/escala − nivel)/ancho + 0,5`. Lo que queda bajo la ventana no se pinta y deja ver el CT; lo que queda sobre ella sale blanco. Parte en nivel 65 % y ancho 70 % (muestra de 30 % a 100 %), lo mismo que el umbral anterior. Una línea dice qué rango se está mostrando y «Restablecer» vuelve a los valores iniciales. La explicación de «Ver más sobre el registro» se actualizó.

**Validación.** Emulación de teléfono: al entrar, «muestra de 30 % a 100 %» y el 18 % de los píxeles de la fusión con color; con nivel 30 y ancho 60, de 0 % a 60 % y el 45 %; con nivel 110 y ancho 40, de 90 % a 130 % y el 1 %; «Restablecer» vuelve a 65 y 70.

## 2026-09-28 · El CT parte fusionado, sin desfase

**Contexto.** El docente pidió no mostrar el CT desfasado: la fusión debe aparecer alineada desde el principio.

**Decisión.** Se quita el desfase al azar de 35 a 70 mm que venía del ejercicio de escritorio. El CT parte en la posición del equipo (mismo marco de referencia, desfase cero). El estudiante revisa la fusión en los tres planos; si lo mueve, «Confirmar registro» sigue diciendo a cuántos milímetros quedó (hasta 3 mm dentro de un vóxel, hasta 8 mm aceptable, más no calza). El desplazamiento se conserva al volver al control de calidad y vuelve a cero al cargar otro archivo. Se actualizaron el comentario del módulo y «Ver más sobre el registro».

**Validación.** Emulación de teléfono: al entrar el desfase es 0, 0, 0; confirmar sin mover da «dentro de un vóxel»; tras mover 12 mm con la flecha, «todavía no calza»; al volver y entrar se conservan los 12 mm; al cargar otro ZIP vuelve a 0.

## 2026-09-28 · Paso 3: OSEM 1 × 1 sin correcciones

**Contexto.** El docente pidió pasar, después del registro, a la OSEM 1 × 1 sin filtro ni atenuación, como en el simulador SPECT 95.

**Decisiones.**
- **El mismo código del escritorio, copiado tal cual:** `algorithm.js` (proyector y retroproyector emparejados), `simulador95-osem.js` (worker OSEM 2D por cortes), `simulador95-psf.js` (funciones que el worker necesita definidas) y `simulador95-pool.js` (reparte los cortes entre trabajadores). Copiados de `spect-lab-95` en eef24fe; no ejecutan nada al cargarse.
- **La receta es la de `prepareBaselineOptions` del escritorio:** 1 iteración, 1 subconjunto (64 vistas), sin corrección de atenuación, sin dispersión, sin recuperación de resolución, sin filtro final e inicio uniforme; fotopico.
- **Se reconstruyen las mismas proyecciones de la FBP:** las corregidas por la aplicación si se corrigió, o las sin corregir. Como en el escritorio, la franja sin medición entra como ceros medidos (el relleno se usa solo en la FBP del registro).
- **Solo con el registro confirmado:** el botón «Siguiente: OSEM 1 × 1 sin correcciones →» aparece al confirmar, y desaparece si el CT se mueve después. Así se respeta el orden del escritorio, aunque en este paso la atenuación todavía no se usa.
- **Visor:** axial, coronal y sagital; parte en los cortes del registro. Tocar la imagen elige dónde cortan los otros dos planos, con una cruz celeste y amarilla. Nivel y ancho en porcentaje del percentil 99,5, con «Restablecer» a 0–100 %. «Ver más sobre la OSEM» explica qué es, por qué 1 × 1 y qué hace la falta de atenuación.

**Validación.** Emulación de teléfono (Pixel 7) con el ZIP del caso 1 modificado y corregido: el botón no se ve antes de confirmar, aparece al confirmar y se oculta al mover el CT; la OSEM de 128 cortes tomó 2,5 s con 2 trabajadores, sin valores negativos; la imagen es la esperable de una sola iteración (borrosa, con hígado y corazón reconocibles en el coronal); el toque mueve los cortes de los otros planos; «Volver al registro» funciona.

**Pendiente.** Mapa de atenuación desde el CT registrado y OSEM con atenuación; más iteraciones y subconjuntos para comparar.

## 2026-09-28 · Paso 4: OSEM con atenuación, iteraciones y comparación

**Contexto.** Tras la OSEM 1 × 1, el docente pidió seguir con lo pendiente: el mapa de atenuación desde el CT registrado, la OSEM con atenuación y la posibilidad de cambiar iteraciones y subconjuntos para comparar.

**Decisiones.**
- **Tarjeta «Nueva reconstrucción»** en la pantalla OSEM: iteraciones (1 a 20), subconjuntos (1, 2, 4, 8, 16), corrección de atenuación, filtro gaussiano final con su FWHM. Dos botones dejan lista la receta del caso de `cardiaco-casos.js` (`CARDIACO_RECETA`: 2 × 8, 8,4 mm), sin y con atenuación, como «Aplicar la receta» del escritorio. Por omisión quedan las opciones de la receta sin atenuación.
- **Mapa μ como en `confirmRegistration` del escritorio:** cada vóxel del SPECT se muestrea en el CT con el desplazamiento del registro confirmado, se acota a −1000…3000 HU y se convierte a μ (cm⁻¹) con `h ≤ 0 ? 0,15·(1 + h/1000) : 0,15 + 0,0001·h`; sin CT queda NaN. Se calcula al pedir la primera reconstrucción con atenuación y se rehace si el registro cambió. Aparece en el historial y se puede mirar en grises.
- **OSEM con atenuación con el mismo worker del escritorio**, con `outsideAir` activado (aire fuera del campo transversal del CT, como el valor por omisión oculto del escritorio). Solo se reconstruyen los cortes que el CT cubre (61 de 128 en el caso 1); el resto queda en azul.
- **Historial y comparación lado a lado:** la nueva reconstrucción va a la izquierda y la que se estaba mirando pasa a la derecha; un selector sobre cada imagen elige cualquiera del historial (hasta seis reconstrucciones, más la referencia 1 × 1 y el mapa μ). Plano, corte, cruz y ventana son comunes. Como en el escritorio, las dos OSEM comparten escala; se agregó «Cada imagen a su propio máximo» porque con atenuación la actividad reconstruida es unas 8,5 veces mayor y la otra se veía casi negra.
- **Tiempo:** la atenuación precalcula, para las 64 vistas y cada punto, la integral de μ hasta el detector, con el `attenuationWeights` del escritorio; es la parte lenta. Hay un aviso de que puede tardar minutos en el teléfono y un botón «Detener».

**Validación.** Emulación de teléfono (Pixel 7), caso 1 modificado: referencia 1 × 1 en 2,4 s; receta sin atenuación, 128 cortes en 6,1 s; receta con atenuación, 61 cortes en unos 90 s con 2 trabajadores; suma de actividad en los cortes con CT 8,5 veces la de sin atenuación; «Detener» corta, informa y deja reconstruir de nuevo; la escala propia deja ver las dos; el mapa μ muestra pulmón, corazón e hígado; sin errores en la consola.

**Pendiente.**
- Con atenuación, una zona muy intensa en el borde lateral derecho del paciente domina la escala en los cortes del corazón. No se investigó si es el hígado reforzado por la corrección o un efecto de la franja sin medición (ceros medidos) combinada con la atenuación.
- Probar el tiempo de la atenuación en un teléfono real.

## 2026-09-28 · Ventana de progreso en las reconstrucciones

**Contexto.** El docente pidió una barra de progreso emergente mientras se reconstruye.

**Decisiones.**
- **Una ventana modal compartida** (`progreso.js`, `<dialog id="dProgreso">`) para la FBP del registro y para todas las OSEM. Muestra qué se reconstruye, la barra con el porcentaje, los segundos transcurridos, la etapa en palabras y un botón «Detener». No se cierra tocando fuera ni con la tecla atrás: solo al terminar o al detener.
- **Reparto de la barra.** FBP: 85 % el filtro rampa y la retroproyección, corte por corte; 15 % el suavizado. OSEM: 10 % el mapa μ si hay atenuación, luego la OSEM, y 10 % el filtro final si lo hay. El motor avisa al terminar cada corte, pero con atenuación cada corte tarda varios segundos; por eso también se usa la vista en curso dentro del corte. La barra nunca retrocede, porque los avisos de los dos trabajadores llegan desordenados.
- **«Detener» ahora detiene de verdad.** Antes, al detener una OSEM se cortaba el trabajo, pero la espera quedaba pendiente para siempre; el mapa μ y el filtro final no se podían detener. Ahora las tres etapas se detienen y la pantalla informa «Reconstrucción detenida». La FBP también se puede detener; para rehacerla se vuelve al control de calidad y se pulsa «Siguiente».
- Se quitaron el aviso y el botón «Detener» que había en la tarjeta de la OSEM: están en la ventana.

**Validación.** Emulación de teléfono: la ventana aparece en la FBP (36 % en el corte 54 de 128) y se detiene; al volver a entrar la FBP termina; en la OSEM 1 × 1 la tecla atrás no la cierra; en la receta con atenuación la barra avanza pareja (3, 17, 25 … 87 % cada 8 s, en 87 s) con la etapa «Atenuación de cada vista: corte 15 de 30, vista 8 de 64»; al detenerla se puede reconstruir otra (sin atenuación, 6,0 s).

## 2026-09-28 · Segunda parte sin cambiar de simulador: reorientación con deslizadores

**Contexto.** El docente pidió pasar directo a la segunda parte, dentro de la misma aplicación. En la reorientación de los ejes no se marcan base y ápex, como en `simulador-cardiaco`: el eje se gira con deslizadores.

**Decisiones.**
- **El mismo núcleo que la segunda parte de escritorio:** `cardiaco-core.js`, copiado tal cual de `simulador-cardiaco` (2480686). Aporta el marco del ventrículo a partir de azimut y elevación, los cortes oblicuos de 56 × 56 vóxeles (eje corto, largo vertical, largo horizontal), el buscador de anillo y la paleta cardíaca. Solo define funciones.
- **Orden de los cortes.** El núcleo espera z hacia la cabeza, como la exportación de SPECT Lab 95, que invierte las filas. La OSEM móvil tiene la fila 0 en la cabeza, así que el volumen se invierte una vez al entrar. X hacia la izquierda del paciente e Y hacia posterior coinciden.
- **Botón «Siguiente: reorientar los ejes con la reconstrucción de la izquierda →»** en la pantalla OSEM: se usa la que está a la izquierda. Si es el mapa μ, lo avisa.
- **El eje parte sin girar (0° y 0°)** y el estudiante lo gira con deslizadores de azimut (−30 a 120°) y elevación (−40 a 60°), con − y + de a 1°. «Volver a 0° y 0°» reinicia. Si el caso trae el eje del equipo (`cardiaco-casos.js`), el resumen dice cuánto se separa, con la tolerancia de 12°; el caso 1 no lo trae y lo dice.
- **Cinco imágenes:** transaxial por el centro con el eje proyectado; plano vertical del eje, el mismo que el escritorio usa para el ápex, donde se ve la elevación; eje corto, largo vertical y largo horizontal. Un deslizador recorre el eje corto de la base al ápex y una línea amarilla marca ese corte en los ejes largos. Techo de la escala.
- **Centro del ventrículo:** lo propone la aplicación con `buscarVentriculo` y el eje típico del escritorio (35° y 12°). Se puede arrastrar sobre cualquier imagen, en el plano de esa imagen, y «Buscar el centro con este eje» lo recalcula. La búsqueda se acota a ±15 cortes alrededor de la fila del máximo de la imagen suma: sin eso, en el estrés del caso 1 ganó un anillo falso del abdomen (fila 87), el mismo problema que la bitácora de `spect-lab-95` registró el 24-09 para el gatillado.

**Validación.** Emulación de teléfono con la OSEM 2 × 8 sin atenuación del caso 1: entra con 0° y 0°; un arrastre de 1/8 del ancho del transaxial mueve el centro 16 vóxeles, lo esperado; − y + cambian de a 1°; el deslizador de eje corto llega a «20 mm hacia el ápex»; buscar, reiniciar y volver a la OSEM funcionan; sin errores en la consola.

**Límites conocidos.** En el estrés del caso 1 (9 mCi) el corazón apenas se distingue en la OSEM, y el centro propuesto quedó por delante del foco más probable del ventrículo: es solo un punto de partida y hay que llevarlo a mano. No se verificó con un caso que traiga el eje del equipo que el azimut y la elevación de referencia den el anillo esperado en esta aplicación.

**Pendiente.** Mapa polar, cavidad y función ventricular.

## 2026-09-28 · Ubicar el corazón con una caja en coronal y sagital

**Contexto.** El docente pidió que, antes de reorientar, se vean un corte coronal y uno sagital y que el estudiante tenga que posicionar una caja en el corazón.

**Decisiones.**
- **Paso nuevo «Ubicar el corazón»** entre la OSEM y la reorientación (`caja.js`). El botón de la OSEM ahora lleva ahí; desde la caja se pasa a reorientar y desde la reorientación se vuelve a la caja.
- **Una caja, dos vistas.** En el coronal la caja fija el rango lateral y el vertical; en el sagital, el anteroposterior y el mismo vertical. El coronal se corta por el centro de la caja de adelante hacia atrás y el sagital por su centro de lado a lado, así que mover la caja en una imagen cambia el corte de la otra. Orientación: cabeza arriba; izquierda del paciente a la derecha en el coronal; adelante a la izquierda en el sagital.
- **Interacción táctil.** Arrastrar dentro mueve la caja sin salir del volumen; arrastrar desde una esquina cambia su tamaño, con un mínimo de 4 cm; tocar fuera la centra en ese punto. Parte en el centro del volumen, con 11 cm de lado, para que haya que llevarla al corazón. Hay techo de escala y «Volver a poner la caja al centro».
- **Qué hace la caja en la reorientación.** Su centro es el centro del ventrículo con el que parte el eje, y el 70 % de su lado menor es el largo inicial del eje. «Buscar el centro con este eje» busca el anillo solo dentro de la caja. Esto reemplaza la búsqueda automática del paso anterior (franja de ±15 cortes alrededor de la fila del máximo de la imagen suma), que en el estrés del caso 1 dejaba el centro fuera del ventrículo. Si se vuelve a la caja y se cambia, la reorientación toma el nuevo centro y conserva los ángulos.

**Validación.** Emulación de teléfono con la OSEM 2 × 8 sin atenuación del caso 1: la caja parte en 46,8–80,2 vóxeles en los tres ejes; arrastrarla en el coronal 10 vóxeles a la derecha y 10 hacia arriba la mueve eso mismo en x y z; la esquina inferior derecha amplía x1 en 6 y baja z0 en 6; un toque fuera en el sagital la centra en y 40 y z 77; la reorientación parte en el centro de la caja (76,5; 40; 77) con largo 23; la búsqueda dentro de la caja encuentra un anillo; volver a la caja la conserva. En el coronal del caso 1 se ve una herradura en la parte alta del tórax, a la izquierda del paciente, donde se pone la caja.

## 2026-09-28 · Candado: desplazar la página o manejar los controles

**Contexto.** El docente pidió un botón con un candado: cerrado, solo se navega por la página; abierto, solo se manejan botones y deslizadores.

**Decisiones.**
- **Botón flotante redondo abajo a la derecha**, siempre visible en todas las pantallas, con 🔒 o 🔓. Al tocarlo aparece un aviso breve con el modo.
- **Cerrado:** `pointer-events: none` en el encabezado y el contenido. El dedo desplaza la página aunque empiece sobre una imagen, y ningún botón, deslizador ni imagen responde, así no se mueve un control sin querer al bajar.
- **Abierto:** `overflow: hidden` y `touch-action: none` en la página. Botones, deslizadores e imágenes se manejan como antes (arrastrar el CT, la caja, los cursores) y un arrastre no desplaza la página. Los cambios de pantalla que suben al inicio siguen funcionando, porque son programáticos.
- **Los diálogos quedan fuera del candado** («Ver más», la ventana de progreso con su «Detener»): funcionan en los dos modos.
- La aplicación parte con el candado abierto, como se comportaba antes en los controles. Se agregó margen al pie para que el botón no tape lo último de la página.

**Validación.** Emulación de teléfono con eventos táctiles de bajo nivel (`Input.dispatchTouchEvent`). El gesto sintético de desplazamiento no mueve la página en este navegador ni sin candado, así que no sirve para probar. Con el candado cerrado, un deslizamiento sobre el texto o sobre una imagen desplaza la página unos 340 px, y tocar un botón o una imagen no hace nada. Con el candado abierto, el mismo deslizamiento no la mueve y los botones responden. Los avisos cambian con el modo.

## 2026-09-28 · La escala de color sigue al contenido de la caja

**Contexto.** El docente pidió que, al poner la caja, la ventana cambie según lo que hay dentro de ella.

**Decisión.** En «Ubicar el corazón» el máximo de la escala es el percentil 99,9 de los vóxeles que están dentro de la caja, no el de todo el volumen; se usa el percentil y no el máximo para que un vóxel suelto no apague el resto. Se recalcula en cada movimiento, con un muestreo con paso que deja unos 60 000 vóxeles, en unos 28 ms. Con la caja sobre el corazón, el ventrículo usa todo el rango de colores y lo que brilla más fuera de la caja (hígado, intestino) sale blanco. La reorientación toma la misma escala, calculada con la caja con que se entra. El techo sigue bajando ese máximo. «Ver más sobre la caja» lo explica.

**Validación.** Emulación de teléfono, OSEM 2 × 8 sin atenuación del caso 1: con la caja al centro el máximo es 0,62 y con todo el volumen 0,54; con la caja sobre la herradura del coronal (x 58–96, y 30–64, z 55–90) baja a 0,45 y el ventrículo se ve con toda la escala; la reorientación usa 0,45.

## 2026-09-28 · Gatillado reconstruido y animado; la segunda parte queda en pausa

**Contexto.** El docente pidió quedarse, por ahora, hasta la reconstrucción y pasar a la adquisición gatillada, animada.

**Decisiones.**
- **Recorrido:** desde la OSEM, «Siguiente: gatillado →». Los pasos de la caja y la reorientación quedan en el código y en la página, pero sin botón que lleve a ellos (el de la OSEM está oculto), para retomarlos después.
- **El ZIP entrega también la gatillada:** `NM_estres_gatillado.dcm` de la misma carpeta (33,6 MB), que se guarda en el teléfono con lo demás. Lo guardado antes de este cambio no la trae y el paso pide elegir el ZIP una vez más.
- **Reconstrucción como `reconstruirGate` del escritorio:** cada uno de los 8 intervalos con `Lab95.gate`, OSEM 2D por cortes con `CARDIACO_GATILLADO` (2 × 8), sin atenuación, inicio uniforme y fotopico, solo en el rango de cortes elegido (`previewRow`/`previewRadius`). Después, el mismo gaussiano 3D de 8,4 mm sobre el subvolumen (`suavizarSub`, copiado de `simulador95-cardiaco.js`).
- **Corrección de movimiento en cada intervalo:** si el estudiante corrigió, cada intervalo se corrige con los saltos que la aplicación encontró en la no gatillada (`Correccion.aplicar` con el cabezal y el paso de cada cuadro de ese intervalo), porque las dos adquisiciones son simultáneas. La entrega modificada movió también la gatillada, con los mismos saltos.
- **Rango de cortes:** sobre una proyección de máxima intensidad coronal de la OSEM de la izquierda, con dos líneas verdes que se arrastran; de 5 a 70 cortes, como el escritorio. Parte en ±15 cortes alrededor de la fila del máximo de la imagen suma.
- **Cine:** transaxial y coronal del mismo intervalo, en un recorte de 64 × 64 vóxeles (unos 21 cm) centrado en el corazón. Al terminar, la aplicación ubica el corte y el centro en el máximo de la actividad promediada entre intervalos, dentro de la región donde `cardiaco-core` busca el ventrículo: sin eso, el cine partía en el borde lateral derecho, que brilla por la franja sin medición. «▶ Latir» a 8 cuadros por segundo (ajustable de 2 a 16), ◀ y ▶ de a un intervalo, una barra con el intervalo actual, techo. La escala es el máximo de los 8 intervalos × 0,9, como el escritorio, para que el engrosamiento sistólico se vea como aumento de brillo. Tocar una imagen mueve el corte de la otra.
- Lectura y reconstrucción con la ventana de progreso; «Detener» funciona.

**Validación.** Emulación de teléfono con el caso 1 modificado y corregido: lectura de la gatillada en 1,5 s (8 intervalos de 64 vistas); rango ajustado a 41 cortes arrastrando la línea superior; los 8 intervalos en 15 a 16 s, con la corrección aplicada; el máximo del corte central varía entre 0,082 y 0,097 a lo largo del ciclo; el cine avanza solo, se detiene y avanza de a uno; volver a la OSEM funciona.

**Límites.** Cada intervalo del estrés del caso 1 tiene la octava parte de 9 mCi: la imagen es muy ruidosa y el latido se aprecia más en el cambio de brillo que en la forma. Falta probarlo con un reposo o con otro caso de más cuentas, y en un teléfono real (la gatillada ocupa unos 67 MB en memoria mientras se reconstruye).

## 2026-09-28 · Reorientar con la reconstrucción del equipo y referencia en las proyecciones

**Contexto.** El docente pidió usar la reconstrucción axial de Siemens para la reorientación de los ejes y mostrar en las adquisiciones, como referencia, dónde está el corazón. El caso 1 no trae reconstrucciones del equipo: se comprobó en la exportación completa del equipo (`CARDIACOS.rar`), donde su estudio se identificó comparando las cuentas de las proyecciones y no tiene ninguna serie reconstruida, como ya decía el manifiesto. El docente entregó entonces el ZIP del caso 3 («Cardiaco Benjamin»), que en `Reposo/Referencia equipo` trae `Recon_transversal_NoAC.dcm`.

**Decisiones.**
- **Del ZIP se extraen, si están,** la reconstrucción transversal del equipo (`Referencia equipo/Recon_transversal_NoAC.dcm`, de estrés o de reposo) y las proyecciones de esa misma fase. Se guardan en el teléfono con lo demás. En el control de calidad aparece «Reorientar con la reconstrucción del equipo (caso N, fase) →», que lleva a la caja y a la reorientación con ese volumen; «Volver» regresa al control de calidad.
- **Se lee con `CardiacoCore.leerVolumen`,** el lector de la segunda parte de escritorio. En el caso 3 son 128 cortes de 3,3 mm con z hacia la cabeza, la convención del núcleo, así que no se invierte; la OSEM de la aplicación sí se invierte. La caja y la reorientación aceptan los dos tipos de volumen.
- **El eje de referencia sale del manifiesto** según el caso y la fase del ZIP; el caso 3 en reposo trae azimut 19,5° y elevación 6,4°.
- **Referencia en las proyecciones** (`referencia.js`): la vista anterior y la lateral izquierda de la adquisición (las de detector más alineado con adelante y con la izquierda del paciente). En la caja se dibujan la caja proyectada y su centro; en la reorientación, el centro y el eje hacia el ápex. Cada volumen entrega su función vóxel → paciente: la OSEM, con la geometría de la cruda; la del equipo, con la posición de su primer corte, que en el caso 3 está 1,5 vóxeles corrida en X respecto del centro de las proyecciones. La proyección usa la misma fórmula del motor. Se agregó también a la caja y la reorientación que se abren desde la OSEM.

**Validación.**
- La orientación del eje corto de Siemens del caso 3 (`Recon_eje_corto_NoAC.dcm`), pasada por `angulosDe` de `cardiaco-core`, da exactamente azimut 19,5° y elevación 6,4°, los del manifiesto: la convención de ángulos de la aplicación es la del equipo.
- Emulación de teléfono con el ZIP del caso 3: aparece el botón; la reconstrucción del equipo abre; con la caja en el ventrículo que encuentra `buscarVentriculo` con ese eje y los ángulos del equipo, el eje corto es un anillo, el largo vertical una «C» abierta a la derecha y el largo horizontal una «U» invertida; el resumen dice 0° de diferencia; en las proyecciones anterior y lateral el centro y el eje caen sobre el foco del corazón, arriba del hígado y el intestino.

**Pendiente.** El encabezado sigue diciendo «Caso 1 · Estrés» aunque se cargue otro caso, y el control de calidad sigue mostrando el estrés.

## 2026-09-28 · Caso 4: una serie de CT y reconstrucción del equipo en las dos fases

**Contexto.** El docente subió el ZIP del caso 4 («Cardiaco Diego»). A diferencia del 1 y el 3, trae dos series de CT por fase («CT 512» y «CT 128») y `Referencia equipo` en estrés y en reposo.

**Decisiones.**
- **Una sola serie de CT:** si la fase trae varias carpetas «CT …», se usa «CT 512», el CT tal como salió del tomógrafo; si no está, la primera. Antes se juntaban los cortes de las dos series: 83 cortes con dos resoluciones distintas, que el registro no podía usar bien.
- **Un botón por cada reconstrucción del equipo:** el caso 4 ofrece «(caso 4, estrés)» y «(caso 4, reposo)». Lo guardado en el teléfono con el formato anterior, una sola reconstrucción, se convierte al cargar.

**Validación.**
- El eje corto de Siemens del caso 4, pasado por `angulosDe`, da estrés 25,4°/13,4° y reposo 24,4°/15,4°: exactamente los del manifiesto, igual que el caso 3.
- Emulación con los tres ZIP: el caso 1 usa 41 cortes de CT y no muestra botones del equipo; el caso 3 usa 37 y muestra el de reposo; el caso 4 usa 33 («CT 512») y muestra los dos. El registro FBP abre en los tres. En el caso 4, estrés y reposo con el eje del equipo dan anillo en el eje corto, «C» en el largo vertical y «U» invertida en el largo horizontal.

## 2026-09-28 · Comparador: reconstrucción de Siemens frente a la del simulador

**Contexto.** El docente pidió comparar las reconstrucciones de Siemens con las del simulador.

**Qué hizo el equipo.** El DICOM de la transversal «Recon – NoAC» lo dice: `ConvolutionKernel = FBP, Btw,0,50,5` (retroproyección filtrada con Butterworth de corte 0,50 y orden 5) y `CorrectedImage = UNIF, MOTN` (uniformidad y movimiento corregidos).

**Decisiones.**
- **Botón «Comparar Siemens con el simulador (caso N, fase) →»** en el control de calidad, uno por cada reconstrucción del equipo que traiga el ZIP.
- **Mismas proyecciones que el equipo:** las corregidas por el equipo (`NM_<fase>_QC_corregido.dcm`) si el ZIP las trae, porque el equipo corrigió el movimiento; si no, las originales. La pantalla dice cuáles se usaron.
- **Tres métodos del simulador:** «Como el equipo» (FBP con rampa por un Butterworth 2D radial, 1/√(1+(f/fc)^2n), aplicado a cada proyección antes de la FBP del motor; corte y orden ajustables), «OSEM 2 × 8» (receta del caso, gaussiano de 8,4 mm) y «FBP rampa».
- **Unidad del corte:** el DICOM no la dice. Se barrió el corte con orden 5 y se midió la correlación con Siemens: caso 4 estrés, máxima entre 0,25 y 0,30 de Nyquist (0,828), 0,792 en 0,50 de Nyquist; caso 4 reposo y caso 3 reposo, curvas más planas, también mayores bajo 0,50 de Nyquist. Leer 0,50 como **ciclos/cm** da 0,33 de Nyquist con píxeles de 3,3 mm, cerca del máximo. Por eso el control está en ciclos/cm, parte en 0,50 y muestra su equivalencia en fracción de Nyquist.
- **Comparación vóxel a vóxel:** la reconstrucción del simulador se remuestrea (trilineal) en la grilla de Siemens con las posiciones de los dos DICOM. Cada imagen va a su propio máximo, porque las unidades son distintas. La diferencia (rojo, más en el simulador; azul, menos) y las métricas usan los dos volúmenes normalizados a la misma suma dentro del cuerpo (vóxeles de Siemens sobre el 10 % de su máximo): correlación de Pearson y diferencia media absoluta en porcentaje de la media. Planos axial, coronal y sagital sincronizados, tocar una imagen mueve los otros cortes, techo, ventana de progreso con «Detener».

**Validación.** Emulación de teléfono:

| | Como el equipo (0,50 c/cm) | Butterworth 1,0 c/cm | FBP rampa | OSEM 2 × 8 |
|---|---|---|---|---|
| Caso 4, estrés | r 0,826 · dif 32,7 % | 0,744 · 44,2 % | 0,664 · 54,9 % | 0,819 · 32,3 % |
| Caso 3, reposo | r 0,864 · dif 24,9 % | 0,834 · 29,7 % | 0,804 · 35,4 % | 0,858 · 28,1 % |

Cada reconstrucción toma de 3,5 a 7 s. En las imágenes, corazón, hígado e intestino quedan en el mismo lugar en las dos; con los volúmenes a la misma suma, el simulador da más actividad en la pared del ventrículo que Siemens.

**Límites.** No se sabe qué más hizo el equipo: corrección de centro de rotación, uniformidad, si su Butterworth es 2D o por fila, la normalización del filtro. La correlación no llega a 1 y la diferencia en el ventrículo puede venir de eso.

## 2026-09-28 · Comparador: ejes cortos y gatillado de Siemens frente al simulador

**Contexto.** El docente preguntó si Siemens usa OSEM. Los DICOM de los casos 3 y 4 dicen `ConvolutionKernel` por serie: la transversal «Isotope (A) – Recon – NoAC» es **FBP Butterworth 0,50 orden 5**; los ejes cortos NoAC y AC son **OSEM 3D 6 × 4 con gaussiano de 9 mm** (el AC con `ATTN`; el del estrés del caso 4, también con `SCAT`); el gatillado en eje corto es **OSEM 3D 4 × 4 con gaussiano de 8,4 mm**. Todas con `UNIF` y `MOTN`; el gatillado, además, con «CLN» y «ABN», códigos cuyo significado no se averiguó. El docente pidió comparar también esas reconstrucciones.

**Decisiones.**
- **Cuatro modos en el comparador:** transversal (lo de antes), eje corto NoAC, eje corto AC y gatillado; los que el ZIP no trae quedan deshabilitados. Por cada fase con `Referencia equipo` se extraen del ZIP también los ejes cortos, el gatillado de Siemens, la gatillada de esa fase y su CT («CT 512»).
- **Grilla del eje corto de Siemens:** vóxel (i, j, k) → paciente = posición del primer corte + i·píxel·fila + j·píxel·columna + k·espaciado·n, con la orientación de `DetectorInformationSequence`. El DICOM no dice el sentido de los cortes: se midió remuestreando la transversal de Siemens en esa grilla y correlacionando con el eje corto de Siemens. Con n = fila × columna da r = 0,77 a 0,89 en las seis series de los casos 3 y 4; con −n, entre −0,16 y 0,09. El gatillado de Siemens viene ordenado por intervalo y, dentro de él, por corte (8 intervalos de 48 a 66 cortes).
- **Recetas del simulador en los ejes cortos:** la de Siemens (6 × 4 con 9 mm; en el gatillado, 4 × 4 con 8,4 mm) o la del caso (2 × 8 con 8,4 mm). OSEM 2D del escritorio, solo en las filas que cubre el eje corto de Siemens (con 6 de margen para el filtro), gaussiano 3D, y remuestreo trilineal a la grilla de Siemens. Con AC, el mapa μ sale del CT de la fase sin desplazamiento, porque comparten marco de referencia. El gatillado usa la gatillada original: el ZIP no trae copia corregida.
- **Vistas:** en los ejes cortos, eje corto, largo vertical y largo horizontal, sacados de la misma grilla en las dos. En el gatillado, «Latir» anima los 8 intervalos a la vez. Las métricas del gatillado suman los 8 intervalos. La transversal ahora también usa la orientación exacta de su DICOM (tiene medio grado de inclinación), y su correlación subió.

**Validación.** Emulación de teléfono:

| | Transversal (como el equipo) | Eje corto NoAC, receta Siemens | NoAC, receta del caso | Eje corto AC, receta Siemens | Gatillado, receta Siemens |
|---|---|---|---|---|---|
| Caso 4, estrés | r 0,844 · 5 s | 0,938 · 14 s | 0,942 · 6 s | 0,949 · 69 s | 0,823 · 73 s |
| Caso 3, reposo | 0,890 · 5 s | 0,891 · 10 s | 0,894 · 5 s | 0,919 · 66 s | 0,856 · 61 s |

En el eje corto el anillo del simulador cae en el mismo lugar y con la misma forma que el de Siemens, y en el largo vertical la misma «C». En el gatillado, el intervalo 1 muestra la cavidad abierta y el 4 casi cerrada en los dos.

**Diferencias que se ven.** Siemens deja en cero todo lo que está fuera del corazón; el simulador no. El gatillado de Siemens se ve con pocos niveles de gris, probablemente porque sus valores enteros son bajos; no se comprobó. La OSEM de Siemens es 3D y en estos equipos suele traer recuperación de resolución; la del simulador es 2D, corte por corte, sin ella.

## 2026-09-28 · Carga provisional de archivos sueltos y de carpetas

**Contexto.** El docente empezó a trabajar con exámenes exportados del archivo de imágenes, que vienen como carpetas con nombres hexadecimales y archivos sin extensión, no como el ZIP de la entrega. Pidió que el simulador permita, mientras tanto, cargar archivos y carpetas.

**Decisiones.**
- **Tres formas de cargar.** Se mantiene el ZIP y se agregan «Elegir archivos» (selección múltiple) y «Elegir carpeta» (con subcarpetas). Están rotuladas como provisionales.
- **La aplicación elige la serie.** Lee solo el encabezado de cada archivo, hasta los píxeles, y se queda con las proyecciones tomográficas originales de medicina nuclear que no son gatilladas ni reconstruidas. Si hay varias, prefiere la que dice estrés y la que no fue corregida por el equipo.
- **Filtro por tamaño antes de leer.** Solo se abren archivos entre 1 y 20 MB: las proyecciones crudas pesan unos 5 MB, un corte de tomografía computada menos de 1 MB y una gatillada más de 30 MB. Evita leer cientos de cortes en el teléfono. (Reemplazado al rehacer el cambio sobre la versión actual: ahora se lee el encabezado de todos los archivos de hasta 60 MB, porque también se cargan el CT y la gatillada.)
- **Un archivo que no es el caso 1 se muestra como «archivo propio».** El título toma la descripción de la serie y no se muestran los antecedentes clínicos del caso 1.
- **También el CT y la gatillada.** Con el mismo marco de referencia que las proyecciones elegidas se toman una sola serie de CT axial (de preferencia la de matriz 512 y no la remuestreada por el equipo) y la adquisición gatillada sin corregir, para que funcionen el registro, la OSEM con atenuación y el gatillado. La reconstrucción del equipo no se carga por esta vía.
- **Se rehízo sobre la versión actual.** El primer intento se escribió sobre una copia local atrasada en 17 commits; se descartó y se volvió a escribir sobre la versión publicada.
- **«Cambiar archivo» vuelve a la tarjeta de carga**, donde están las tres formas, en vez de abrir directamente el selector del ZIP.
- **Identidad.** La aplicación no lee ni muestra nombre, RUT ni institución. Los archivos se leen en el dispositivo y no se envían a ningún servidor.

**Límite conocido.** El botón de carpeta depende del navegador del teléfono; si no está disponible, se usa «Elegir archivos» y se marcan todos.

## 2026-09-28 · Se vuelve a habilitar la reorientación de ejes

**Contexto.** La segunda parte (ubicar el corazón con una caja y reorientar los ejes) había quedado en pausa: el botón de entrada desde la OSEM estaba oculto y solo se llegaba a la reorientación por la reconstrucción del equipo, que únicamente traen los ZIP con «Referencia equipo». El docente pidió reincorporarla.

**Decisiones.**
- **El botón vuelve a estar visible al final de la OSEM**, junto al de gatillado: «Siguiente: reorientar los ejes (primero, ubicar el corazón)». El código de la caja y de la reorientación no cambió.
- **La referencia del eje es del caso 1.** Con un archivo que no es el caso 1 (por ejemplo, un examen cargado por carpeta) la reorientación se abre sin referencia.
- **Texto de carga.** Cuando el caso 1 se carga por carpeta, el mensaje ya no repite «Archivo propio».

## 2026-09-28 · Reorientación con el eje y la receta del equipo (provisional)

**Contexto.** El docente analizó un eje corto con atenuación reconstruido por el equipo y preguntó si el simulador podía adoptar el mismo zoom y la misma posición para comparar. De las dos opciones propuestas eligió, por ahora, la que vive en la pantalla de reorientación, y pidió tres cosas: usar la misma OSEM que el equipo, llevar el resultado a la misma escala de valores y enmascarar. La corrección de movimiento no importa.

**Decisiones.**
- **Solo con exámenes cargados por carpeta.** Al elegir la carpeta se guardan también las reconstrucciones del equipo hechas con OSEM, no gatilladas, que comparten marco de referencia con las proyecciones. En la reorientación aparece el botón «Usar el eje y la receta del equipo (provisional)». Con los ZIP de la entrega no aparece: a un estudiante le daría el eje.
- **La receta se lee del DICOM del equipo**, no se escribe a mano: `ConvolutionKernel` («3DOSEM,6i,4s» y «Gauss,9,00mm») da iteraciones, subconjuntos y filtro; `CorrectedImage` dice si hubo atenuación (ATTN) y dispersión (SCAT). Si hay eje corto con y sin atenuación, se prefiere el que tiene atenuación cuando hay CT.
- **Atenuación** con el CT registrado en el paso de registro, con la misma conversión de HU a μ del resto de la aplicación.
- **Dispersión** por doble ventana con la ventana inferior del archivo, k = 0,5, suavizada con 10 mm y escalada por el cociente de anchos de ventana. No se sabe qué método usa el equipo. Medido en el caso 4 de estrés: con dispersión r = 0,911; sin ella r = 0,915. No cambia el parecido; se deja activada porque el equipo la declara.
- **Misma posición y mismo zoom.** La reconstrucción del equipo se lleva, con interpolación trilineal, a la grilla del simulador (x izquierda, y posterior, z hacia la cabeza). Las dos se cortan con el mismo código, el mismo centro y el mismo marco. El marco es el del DICOM del equipo, exacto: a = normal a los cortes orientada hacia el ápex, v = dirección de las columnas, u = a × v. Coincide con el marco de `cardiaco-core` salvo un giro de menos de medio grado en el plano del corte.
- **Centro** = centroide de la máscara del equipo. **Largo del eje** = extensión de la máscara a lo largo del eje.
- **Máscara.** El equipo deja en cero lo que está fuera de un elipsoide alrededor del corazón. El simulador se pone en cero fuera de esa misma máscara, tomada por vecino más cercano.
- **Misma escala de valores.** El simulador se multiplica por un factor que iguala su suma a la del equipo dentro de la máscara. Las dos filas de imágenes usan la misma escala de color, de 0 al máximo del equipo.
- **Los deslizadores siguen activos.** Al mover el azimut o la elevación se deja el marco exacto y se vuelve al de los ángulos; las dos filas se mueven juntas. Hay un botón para volver al eje exacto del equipo.

**Validación.** En local, emulación de teléfono, carpeta descomprimida del caso 4 de la entrega docente (174 archivos): eligió «Stress [Recon - AC]», receta 6 × 4 con atenuación y gaussiano de 9 mm, 28 s. Eje del equipo: azimut 25,4°, elevación 13,4°. Correlación 0,911 y diferencia media 20,3 % dentro de la región con actividad. En las imágenes, el anillo, la «C» del largo vertical y la herradura del largo horizontal caen en el mismo lugar y con el mismo tamaño en las dos filas.

**Diferencias que quedan.** La OSEM del equipo es 3D y trae recuperación de resolución; la del simulador es por cortes y sin ella. La imagen del simulador se ve más granulada. El factor de escala no tiene significado físico: el DICOM del equipo no declara unidades.

## 2026-09-28 · Cargar la imagen del equipo en la reorientación

**Contexto.** El docente pidió poder cargar la imagen de Siemens para compararla con lo que hace el simulador. La entrada anterior solo tomaba la imagen del equipo si venía en la carpeta, y siempre reconstruía de nuevo con la receta del equipo.

**Decisiones.**
- **Botón «Cargar imagen del equipo…» en la pantalla de reorientación.** Acepta un DICOM de medicina nuclear reconstruido con OSEM, en eje corto (cortes oblicuos) y no gatillado. Si no comparte marco de referencia con las proyecciones, avisa que es de otro estudio o de otra fase.
- **Al cargarla se compara de inmediato con la reconstrucción que el simulador ya hizo** (la que se estaba reorientando), sin reconstruir: adopta el eje, el centro y el zoom del equipo, se enmascara con su máscara y se lleva a su escala de valores.
- **Dos botones quedan disponibles:** «Comparar con mi reconstrucción» y «Reconstruir con la receta del equipo y comparar». La imagen cargada a mano tiene prioridad sobre las que vinieron con la carpeta.
- **Disponible con cualquier forma de carga**, también con el ZIP. El docente lo pidió así; quien tenga una imagen del equipo puede ver su eje.
- **La comparación se separó de la reconstrucción** en `eje-equipo.js` (`alinear`), para que los dos usos compartan grilla, máscara, escala y medidas.

**Validación.** En local, emulación de teléfono, ZIP del caso 4 de la entrega y su `Recon_eje_corto_AC.dcm` cargado a mano. Frente a la reconstrucción propia 1 × 1 sin correcciones: r = 0,615 y diferencia media 43,9 %, en 0,5 s. Con la receta del equipo: r = 0,911 y 20,3 %, en 28 s. En los dos casos las dos filas muestran el corazón en el mismo lugar y con el mismo tamaño.

## 2026-09-28 · Acceso directo a la comparación con el equipo

**Contexto.** El docente pidió un botón al inicio que lleve directamente a la comparación entre la reconstrucción del simulador con la receta del equipo y la de Siemens.

**Decisiones.**
- **En la pantalla inicial**, tarjeta «Comparación directa con el equipo (provisional)»: elegir carpeta o archivos. La aplicación carga proyecciones, CT e imagen del equipo y pasa sola a la comparación.
- **En el control de calidad**, botón «Ir directo: simulador con la receta del equipo frente a Siemens». Sirve cuando el teléfono ya tenía el examen guardado. Si falta la imagen del equipo, abre el selector para elegirla.
- **Se saltan el registro, la OSEM del estudiante y la caja.** El CT entra sin desplazamiento, porque SPECT y CT comparten marco de referencia; si ya había un registro confirmado con las mismas proyecciones, se usa ese.
- **Proyecciones:** las corregidas por la aplicación si ya se pulsó «Corregir»; si no, las crudas.
- **La pantalla es la de reorientación**, con el eje exacto del equipo. «Volver» lleva al control de calidad. «Comparar con mi reconstrucción» no se ofrece, porque en este camino no hay reconstrucción propia.

## 2026-09-28 · Comparación con la reconstrucción del equipo sin atenuación

**Contexto.** El docente pidió lo mismo que el acceso directo, pero con la reconstrucción del equipo sin corrección de atenuación (NoAC).

**Decisiones.**
- **Selector «Imagen del equipo: con atenuación (AC) / sin atenuación (NoAC)»** en los tres lugares donde se usa: la tarjeta de comparación directa de la pantalla inicial, el control de calidad y la pantalla de comparación. Es un solo valor compartido.
- **El tipo se reconoce por el DICOM**, no por el nombre del archivo: `CorrectedImage` trae `ATTN` o no.
- **Antes la aplicación elegía sola** (prefería la que tenía atenuación si había CT). Ahora usa la que dice el selector y, si no está, avisa cuáles hay.
- **Cargar una imagen a mano pone el selector en su tipo.**
- **En la pantalla de comparación, cambiar el selector rehace la comparación** en el mismo modo (receta del equipo o reconstrucción propia).
- **Sin atenuación no se usa el CT** y el cálculo es mucho más corto.

## 2026-09-29 · Sección «Mapa polar y resultados en vivo» (estrés con atenuación)

**Contexto.** El docente pidió una sección donde se modifique el ángulo o la receta del estrés con atenuación y se vea en vivo cómo cambian el mapa polar de QPS y los demás datos de las pantallas del equipo, desplazando la página. Se decidió trabajar siempre con un mismo caso de referencia.

**Origen del algoritmo.** Se obtuvo antes, en Python, por ingeniería inversa de los resultados del equipo (carpeta local `Documents\mapa-polar-qps`, con su propia documentación). Aquí se llevó a JavaScript.

**Decisiones.**
- **Dos archivos.** `qps-nucleo.js` es el cálculo, sin interfaz; `qps.js` es la sección. El núcleo se validó contra Python con los mismos cortes: centro, semiejes, base, bordes, volumen, pared, cuentas, forma, excentricidad y extensión coinciden hasta el tercer decimal; el valor medio por segmento difiere a lo más 0,08 puntos.
- **Referencia.** La reconstrucción del simulador con la receta y el eje del equipo, en su escala y con su máscara. Con ella se calibran una sola vez la base, los bordes de la pared, el límite normal, la referencia de puntaje por segmento y cinco factores (cuentas, forma, excentricidad, extensión y severidad). Después todo queda congelado.
- **En la referencia, la sección muestra exactamente los números del equipo.** Volumen 43 ml, pared 120 ml, cuentas 1105 mil, defecto 25 ml, extensión 21 %, TPD 16 %, forma 0,46, excentricidad 0,86, suma de puntajes 13.
- **El ángulo se cambia en vivo.** Dos deslizadores, cambio de azimut y de elevación respecto del eje del equipo, de −25° a +25°. Cada recálculo toma unos 150 ms en la emulación. El eje se impone; el algoritmo solo ajusta centro y semiejes.
- **La receta necesita reconstruir.** Iteraciones, subconjuntos, filtro, atenuación y dispersión. Se reconstruye con el motor del simulador y se usa el factor de escala de la referencia, para que las cuentas cambien con la receta.
- **El límite normal sigue a la anatomía.** Se guarda sobre el mapa de referencia y se lleva, lugar por lugar, a la geometría de cada condición. La holgura fuera de la zona es de 3 puntos y crece hasta 12 hacia la base, donde las cuentas caen rápido y cambian mucho con el eje.
- **Aviso de ajuste inestable.** Si la pared medida cambia más de 20 % o el semieje largo más de 12 % con solo girar el eje, la sección lo dice y pide acercar el eje. En las pruebas ocurre desde unos ±15° de elevación.
- **Solo el caso de referencia tiene datos del equipo.** Se reconoce por la huella del marco de referencia. Con otro examen la sección funciona sin extensión, TPD ni puntajes.
- **Contenido de la sección, de arriba abajo:** controles de ángulo (fijos arriba), receta, tabla de resultados con columna de referencia y de cambio, mapa polar actual y de referencia, puntajes, cortes con los bordes de la pared y superficie, todos los cortes, tabla por segmento y nota.

**Validación.** En local, emulación de teléfono, con la carpeta de trabajo del caso de referencia. Preparación: 57 s (reconstrucción con atenuación y calibración). Giro de azimut +10°: volumen 44 ml, pared 123 ml, extensión 20 %, suma de puntajes 14. Receta 2 × 8 sin atenuación: 3 s; cuentas 372 mil, extensión 62 %. «Volver al eje y a la receta del equipo» deja todo sin cambios. Ninguna petición sale del navegador.

**Lo que es estimación, y se dice en la sección.** El equipo no guardó su mapa polar con atenuación: la zona anormal de referencia se armó dentro de los segmentos que el equipo puntuó, hasta completar 21 %. Los puntajes usan una referencia por segmento fijada para dar el puntaje del equipo. La magnitud del cambio de extensión con la receta no es confiable: el límite está pegado al mapa de referencia.

**Publicación.** Quedó primero solo en la copia local, porque trae constantes obtenidas de un examen real. El docente pidió publicarla el mismo día.

## 2026-09-29 · Caso 7 en ZIP y sección del mapa polar desde el ZIP

**Contexto.** El docente pidió un ZIP con los archivos del caso de referencia y publicar el simulador.

**Decisiones.**
- **El caso de referencia pasa a ser el «caso 7».** El ZIP sigue la estructura de la entrega: `Caso 7/Estres/NM_estres.dcm`, `CT 512/` y `Referencia equipo/` con el eje corto con y sin atenuación y la transversal. Solo trae el estrés.
- **DICOM anonimizados.** Se vaciaron nombre, identificador, fecha de nacimiento, número de acceso e identificador de estudio; se quitaron institución, médicos, operador, estación, número de serie y todas las etiquetas privadas. Se conservan sexo, edad, fechas del examen y los identificadores de estudio, serie y marco de referencia, porque el simulador reconoce el caso por el marco. Se comprobó que ningún archivo contiene el nombre, el identificador ni la institución del original.
- **El simulador toma del ZIP los ejes cortos del equipo** de las mismas proyecciones que abre, y los entrega a la sección del mapa polar. Antes solo los tomaba al cargar por carpeta.

## 2026-09-29 · Mapa polar en vivo: ejes a la vista y reconstrucciones guardadas

**Contexto.** El docente pidió ver los ejes al manipularlos y que la reconstrucción quede guardada, para no reconstruir cada vez.

**Decisiones.**
- **Dos imágenes junto a los deslizadores, dentro del bloque fijo.** Corte transversal, donde se ve el azimut, y plano vertical que contiene el eje del equipo, donde se ve la elevación. Eje actual en celeste con un punto en el ápex; eje del equipo en blanco punteado; centro en amarillo. Se redibujan con cada movimiento.
- **Guardado en el dispositivo.** Base propia en IndexedDB (`cardiaco-movil-recon`), separada de la que guarda los archivos, para no cambiarle la versión. Se guardan la reconstrucción de referencia con su calibración y cada receta que se reconstruye.
- **Cada volumen se guarda recortado** a la caja que tiene datos: fuera de la máscara del equipo todo es cero. Pesa menos de medio megabyte en vez de 8.
- **La clave incluye** una versión, la huella del marco de referencia, si las proyecciones están corregidas y la receta. Si cambia el algoritmo se sube la versión y lo guardado deja de usarse.
- **Las recetas guardadas aparecen como botones** y se muestran sin reconstruir. Hay un botón para borrarlas.
- **La calibración guardada se reutiliza**: el núcleo acepta una calibración previa y no vuelve a buscar la base.
- **Bloque fijo con el candado abierto.** El candado abierto bloqueaba el desplazamiento con `overflow:hidden` en `html` y en `body`; eso convertía el cuerpo en el contenedor del bloque fijo, que volvía a su lugar al abrir el candado. Ahora solo se bloquea `html`: el bloque de ejes queda arriba en los dos modos.

**Validación.** En local, emulación de teléfono, con el ZIP del caso 7. Primera vez: 45 s hasta la sección. Recargando la página, sin volver a elegir el ZIP: 0,3 s, mismos resultados. Receta ya probada: menos de 1 s. Bajando 1400 px, con el candado cerrado o abierto, los ejes siguen a la vista.

## 2026-09-29 · El candado solo bloquea deslizadores y ejes en pantalla

**Contexto.** El docente indicó que el candado solo debe bloquear los deslizadores y los ejes en pantalla. Antes, cerrado dejaba solo desplazar la página y abierto impedía desplazarla.

**Decisiones.**
- **La página siempre se desplaza y los botones siempre funcionan**, con el candado abierto o cerrado.
- **Cerrado bloquea** los deslizadores, sus botones − y +, y las imágenes donde se arrastran ejes, centros o cursores (todas las del simulador salvo las marcadas como solo de lectura, `canvas.libre`). Los deslizadores bloqueados se ven atenuados.
- **Abierto, un deslizador deja pasar el gesto vertical** (`touch-action: pan-y`): arrastrarlo hacia el lado lo mueve y deslizar hacia arriba o abajo sobre él desplaza la página. Las imágenes de ejes siguen tomando el arrastre en cualquier dirección, porque ahí el gesto es mover el eje.
- La aplicación sigue partiendo con el candado abierto.

## 2026-09-29 · Mapa polar con atenuación armado desde el informe, y los tres ejes a la vista

**Contexto.** El docente pidió leer el informe, armar un mapa polar con atenuación y que al mover los deslizadores se vean el eje corto, el largo vertical y el largo horizontal.

**Lo que dice el informe (sin identidad).** Defecto inferolateral apical, medio y basal, de cerca de 10 % del ventrículo, reversible por completo; interpretado en las imágenes sin atenuación (SSS 6, SRS 1, SDS 5). Las imágenes con atenuación no se usaron para interpretar, por actividad intestinal en reposo. Informa además TID 0,8 y razón pulmón-corazón 0,36; la pantalla del equipo muestra 0,86 y 0,51.

**Decisiones.**
- **La zona de referencia con atenuación parte de la zona real sin atenuación.** Se guardó la zona negra que QPS dibujó en el mapa de estrés sin atenuación (96 × 96, codificada por corridas, 592 píxeles, centrada a 22°, entre lateral e inferior). Sus puntos entran primero; después, dentro de los segmentos que el equipo puntuó con atenuación, los más bajos respecto de lo mejor de su anillo, antes los de más puntaje, hasta completar 21 %.
- **La nota de la sección cita el informe** y explica de dónde sale la zona.
- **Tres cortes más en el bloque fijo:** eje corto, largo vertical y largo horizontal por el centro, con los bordes de la pared, rehechos con cada movimiento. Un botón «Ocultar imágenes» deja solo los deslizadores.
- Las reconstrucciones guardadas siguen sirviendo: la zona no cambia la reconstrucción ni la calibración.

## 2026-09-29 · Recorrido del caso 7, pasos 1 a 4

**Contexto.** El docente pidió ordenar el simulador para el caso 7 en un recorrido fijo: control de calidad con saltos y corrección automática; registro del mapa de atenuación ya alineado; caja y orientación de ejes que parten torcidos al azar; mapa polar con posibilidad de modificar ejes; luego caja y ejes del gatillado, mapa QGS con ventrículo en 3D y, al final, las pantallas completas, para lo cual entra también el reposo. Durante el trabajo el estudiante ve la receta del equipo; el eje y los resultados del equipo se ven al final, con un botón.

**ZIP nuevo del caso 7** (`mapa-polar-qps/armar_zip_caso7.py`): estrés y reposo, cada uno con proyecciones, gatillada, CT e imágenes del equipo (ejes cortos con y sin atenuación, transversal y gatillado), anonimizados; sin las copias corregidas por el equipo. Dos saltos a lo largo de la camilla en las proyecciones de estrés, crudas y gatilladas: 3 píxeles desde el paso 10 y 2 más desde el paso 22. 105 archivos, 31 MB. Una versión sin saltos queda solo en el computador del docente.

**Corrección automática mejorada.** El salto de 2 píxeles se medía en 1,5 y el umbral era 1,77. Ahora los candidatos débiles (sobre 60 % del umbral) se aceptan si el perfil de cinco pasos antes y cinco después confirma al menos 1,5 píxeles en el mismo sentido. Caso 7: encuentra los dos saltos. Caso 7 sin saltos y los cinco originales: ningún salto. Casos 1 a 5 modificados: igual que antes.

**Decisiones del recorrido (`caso7.js`).**
- Barra de pasos bajo el título; se puede volver a los pasos ya alcanzados.
- En el caso 7 se ocultan los accesos de las otras secciones (comparador, acceso directo, OSEM paso a paso).
- Paso 2: el registro existente, que ya parte alineado; al confirmar aparece «Paso 3».
- Paso 3: reconstruye con la receta del equipo sobre las proyecciones que dejó el estudiante, corregidas o no. La caja y la reorientación usan la reconstrucción completa, sin la máscara del equipo, para que ubicar el corazón no sea trivial. El eje parte entre 8° y 15° fuera del eje del equipo, en azimut y elevación, con signo al azar.
- Paso 4: el mapa polar parte del eje y del centro que dejó el estudiante. La calibración viene congelada en `caso7-constantes.js`, obtenida con la aplicación sobre las proyecciones sin saltos y con el eje del equipo; así la corrección, el eje y la receta cambian los resultados. La columna del equipo muestra lo que informó el equipo y se ve solo al pulsar «Ver el resultado del equipo».

**Validación.** Emulación de teléfono, ZIP con saltos. Corrigiendo y con el eje a 2° del equipo: volumen 46 ml, extensión 19 %, suma de puntajes 20 (equipo: 43 ml, 21 %, 13). Sin corregir los saltos: con el eje del equipo sobre esa reconstrucción, la extensión sube a 43 %.

## 2026-09-29 · Recorrido del caso 7, pasos 5 y 6: gatillado y mapa QGS

**Decisiones (`caso7-gatillado.js`).**
- **Paso 5.** Reconstruye los 8 intervalos con la receta del equipo para el gatillado (OSEM 4 × 4, sin atenuación, gaussiano 8,4 mm), solo en 49 cortes alrededor del corazón. Si el estudiante corrigió el movimiento, cada intervalo se corrige con los mismos saltos. La caja y la reorientación trabajan sobre la suma de los intervalos; el eje parte otra vez torcido al azar, entre 8° y 15°. Se guarda en el dispositivo, recortado a una caja alrededor del corazón.
- **Paso 6.** Con el eje y el centro del estudiante: elipsoide común sobre la suma, perfiles por intervalo, bordes de la pared, volumen por intervalo, fin de diástole y de sístole, fracción de eyección, forma, excentricidad, curva de volumen por spline periódico y llenado (PER, PFR, PFR2, MFR/3, TTPF). Cuatro mapas polares: perfusión en fin de diástole y de sístole, movimiento del borde interno y engrosamiento por aumento de cuentas.
- **Calibración congelada** en `caso7-gatillado-constantes.js`: base y bordes por intervalo, rectas de los cuatro mapas y factores de forma y llenado, obtenidos con la aplicación sobre el gatillado sin saltos y con el eje del equipo. En esa condición los doce números coinciden con QGS.
- **Ventrículo en 3D:** superficie interna suavizada, sólida, que late en los 8 intervalos, y superficie externa de fin de diástole en alambre naranja, en la vista oblicua anterior derecha de QGS. Se gira arrastrando; el candado cerrado la bloquea.
- Los números del equipo se ven al pulsar «Ver el resultado del equipo», igual que en el paso 4.

**Validación.** Emulación de teléfono, ZIP con saltos, corrigiendo, eje del gatillado a 2° del equipo. Paso 5: 16 s. Paso 6: volumen de fin de diástole 56 ml (equipo 55), de fin de sístole 18 (18), fracción de eyección 67 % (67), PER −3,50 (−3,60), TTPF 126 ms (130).

**Pendiente.** Paso 7, pantallas finales con el reposo.


## 2026-09-29 · Caso 7: registro con configuración de partida y pantallas del equipo en el paso 6

**Decisiones.**
- **Paso 2.** En el caso 7 el registro parte en axial, corte 43 de 128, mezcla SPECT 50 %, ventana del SPECT de 10 % a 92 % (nivel 51, ancho 82) y CT en tejido blando, como pidió el docente. La configuración vive en `Caso7.REGISTRO` y se pasa a `Registro.abrir`. «Restablecer» vuelve a esa ventana, no a la general. Fuera del caso 7 el registro parte con los valores de siempre.
- **Paso 6.** Al pulsar «Ver el resultado del equipo» aparecen, junto a lo del estudiante, la curva de volumen y llenado del equipo y sus cuatro mapas polares. Son recortes del savescreen QGS de estrés que dejan fuera el bloque de identidad, guardados como `caso7-qgs-equipo-curva.png` y `caso7-qgs-equipo-mapas.png`. Siguen ocultos mientras el estudiante trabaja, igual que la tabla.

**Validación.** Recorrido local en emulación de teléfono con el ZIP con saltos: registro inicial correcto, imágenes del equipo visibles al revelar, sin errores.

## 2026-09-29 · Diseño para tablet apaisada

**Contexto.** La aplicación deja de usarse en teléfono: se usará en una tablet en horizontal.

**Decisiones.**
- **Dos columnas desde 900 px de ancho.** `apaisado.js` reparte cada paso en un lienzo a la izquierda, con las imágenes, y un panel a la derecha, con controles, textos y botones. El panel queda fijo en pantalla y tiene su propio desplazamiento. Bajo 900 px todo vuelve a su orden original, así que la versión angosta sigue funcionando.
- **Tamaños por paso**, para que cada imagen quepa en la altura sin desplazar: la fusión del registro es cuadrada y ocupa el alto; la reorientación muestra dos imágenes arriba y tres abajo; la caja muestra sus dos cortes y las dos proyecciones de referencia.
- **Control de calidad comparando:** cuatro columnas, cine y sinograma arriba, suma y linograma abajo, sin corregir junto a corregido.
- **Mapa polar y QGS:** los resultados a la izquierda se recorren con la página, y el panel deja a mano los ejes, la receta y la tabla. En QGS, el ventrículo 3D y la curva van lado a lado.
- Los textos que decían «teléfono» ahora dicen «tablet».

**Validación.** Recorrido del caso 7 en 1180 × 820 y en 390 × 844, sin errores.

## 2026-09-29 · Caso 7 en dos fases: estrés, reposo, pantallas finales y menús de resultados

**Contexto.** El docente fijó el orden: A. estrés (control de calidad, registro, caja y ejes, ejes del gatillado); B. reposo (los mismos cuatro pasos); después, generación de las pantallas finales, mapa polar con menú estrés/reposo y mapa QGS con menú estrés/reposo.

**Decisiones.**
- **Barra de pasos en tres grupos**: «A. Estrés», «B. Reposo» y «Resultados». Se puede volver a cualquier paso ya hecho. Al volver a la otra fase se recargan sus proyecciones, CT y gatillada desde el ZIP, se recupera su corrección de movimiento y, al reabrir la reorientación, el eje que dejó el estudiante.
- **Cada fase guarda lo suyo** (`caso7.js`): reconstrucción, registro, ejes estáticos y gatillados, gatillada y corrección. EjeEquipo recibe los ejes cortos del equipo de las dos fases y elige el de cada una por su marco de referencia, así la receta del reposo sale de su propio DICOM (OSEM 6 × 4, atenuación sin dispersión, 9 mm).
- **El mapa polar ya no va entre la caja y el gatillado**: tras orientar el eje estático se pasa directo a reconstruir y orientar el gatillado de la misma fase.
- **Reposo calibrado como el estrés**: números del equipo del reposo con atenuación (pantalla Splash AC) y de su QGS, constantes congeladas por huella de fase en `caso7-constantes.js` y `caso7-gatillado-constantes.js`, obtenidas con el eje del equipo. El reposo con atenuación del equipo trae «Mask Failure: QC=4.47» (87 ml); la referencia reproduce ese resultado tal como lo informó el equipo y la nota del mapa polar lo explica.
- **Pantallas finales** (`pantallas7.js`): cuatro pantallas con la disposición de las del equipo, calculadas con los ejes del estudiante y la receta del equipo: Splash AC, QPS AC (mapas de estrés y reposo, reversibilidad, puntajes Str/Rst/Rev, SSS, SRS, SDS, TID), QGS del estrés y QGS del reposo. Dicen arriba que las generó la aplicación y no llevan identidad. Se amplían al tocarlas y se descargan en PNG. No se generan las pantallas sin atenuación, Raw ni Surface: el recorrido reconstruye con atenuación.
- **Imágenes del equipo en QGS por fase**: recortes sin identidad de los savescreen QGS de estrés y de reposo.

**Validación.** Recorrido completo en 1180 × 820, con clics: modo exportación con los ejes del equipo (números del reposo iguales a los del equipo) y modo normal con ejes a 2° del equipo. Sin errores de JavaScript.

## 2026-09-29 · Caso 7: los pasos 3 y 4 siempre reconstruyen

**Contexto.** El docente pulsó «Paso 3» en el estrés y la caja apareció al instante: la aplicación usaba la reconstrucción guardada en el navegador de una sesión anterior (o la de memoria, en la misma sesión) y no se veía reconstruir.

**Decisiones.**
- El botón del paso 3 siempre reconstruye con la receta del equipo (`EjeEquipo.ejecutar` con `forzar`), y el del paso 4 siempre reconstruye el gatillado (`Gatillado7.reconstruir` con `forzar`).
- Lo guardado se sigue usando solo al volver a un paso desde la barra, en las pantallas finales y en los menús del mapa polar y del mapa QGS.
- Si las proyecciones son las mismas (misma corrección), la reconstrucción da lo mismo y se recupera el eje que el estudiante ya había dejado.
- Se quitó el guardado de la reconstrucción completa sin máscara, que ya nadie leía.

**Validación.** Recorrido completo con clics: volver del paso 3 al registro y pulsar otra vez el paso 3 reconstruye de nuevo (53 s en el computador); el paso 4 reconstruye el gatillado en las dos fases.

## 2026-09-29 · Caso 7: sin atenuación y falla de máscara explicada

**Contexto.** El docente pidió incluir las imágenes sin atenuación, ser explícito con la falla de máscara del reposo con atenuación y explicarla dentro del simulador.

**Decisiones.**
- **Reconstrucción sin atenuación de cada fase** al generar las pantallas finales, con la receta del equipo leída de su eje corto sin atenuación (OSEM 6 × 4, 9 mm) y los ejes del estudiante. El equipo usó el mismo eje para sus series con y sin atenuación.
- **Pantallas finales: seis.** Splash y QPS sin atenuación (las que el equipo guardó y con las que se interpretó), Splash y QPS con atenuación, QGS del estrés y del reposo.
- **Mapa polar con dos menús**: fase (estrés, reposo) y atenuación (con, sin). Sin atenuación, la referencia se calibra contra la pantalla QPS sin atenuación del equipo, con la zona bajo el límite que dibujó, y al revelar el resultado se ve el mapa polar que guardó el equipo (recortes sin identidad). Constantes congeladas `22d4f455|noac` y `474e44e4|noac`, obtenidas con el ZIP sin saltos y el eje del equipo.
- **Falla de máscara, explícita**: aviso rojo siempre visible en el mapa polar del reposo con atenuación; fila «Equipo: Mask Failure: QC=4.47» y recuadro rojo en las pantallas con atenuación; nota en la caja del reposo que señala la actividad intestinal; y un diálogo «La falla de máscara del reposo con atenuación»: qué es la máscara, qué avisó el equipo (QC 4,47 frente a 1,12, 1,41 y 1,38 en los otros estudios), por qué falló, cómo se reconoce en los números (52 → 87 ml, TID 0,50 frente a 0,86, extensión 1 % → 9 %), qué hizo el médico, qué hace el simulador (base en 150° y borde interno de 0,14 sigmas para reproducir los 87 ml; el mismo reposo sin atenuación queda en 128° y 0,42) y qué hacer en la práctica.
- Las reconstrucciones guardadas del mapa polar llevan el tipo en la clave, para no mezclar con y sin atenuación.

**Validación.** Recorrido completo con clics. Con los ejes del equipo y sin saltos, los mapas sin atenuación dan los números del equipo (estrés 42 ml, extensión 11 %, SSS 6; reposo 52 ml, 1 %, SRS 1). Con el estudiante simulado (centro corrido un vóxel por eje y eje a 2°), el estrés sin atenuación da SSS 15 frente a 6: los puntajes son sensibles al centro.

## 2026-09-29 · Caso 7: los ejes del estudiante parten en 0° y 0°

**Contexto.** El docente pidió que los ejes del estudiante partan siempre en 0° de azimut y 0° de elevación, para que el estudiante los corrija. Antes partían torcidos al azar, entre 8° y 15° del eje del equipo.

**Decisiones.**
- La primera vez que se orienta cada paso (estático y gatillado, en estrés y en reposo), el eje parte en 0° y 0° (`partirEnCero` en `caso7.js`).
- **Eje vivo por fase y por paso.** Se encontró que la reorientación volvía el eje a 0° y 0° cada vez que recibía una reconstrucción distinta (pulsar otra vez el paso 3 o el 4, ir del gatillado al estático, cambiar de fase), y el recorrido solo lo reponía si el estudiante ya había avanzado. Ahora la reorientación avisa en cada repintado (`Reorientar.estado.alCambiar`) y el recorrido anota el eje en la fase y el paso de esa reconstrucción. Al reabrir, si hubo reinicio, repone el eje del estudiante; si nunca lo orientó, parte en 0° y 0°. Si el estudiante cambia la corrección y la reconstrucción es otra, vuelve a partir en 0° y 0°.
- En el mapa polar del caso 7, los deslizadores muestran el ángulo real del eje (el del estudiante más el giro) y no el giro desde su eje, que se leía como 0°.

**Validación.** Recorrido completo con clics: los cuatro pasos parten en 0° y 0°; caja y vuelta mantienen el eje; volver del registro y pulsar otra vez el paso 3 reconstruye y recupera el eje del estudiante; al volver al estrés desde los resultados se recupera su eje.

## 2026-09-29 · Caso 7: comparación par a par, tutorial flotante y «Saber más»

**Contexto.** El docente pidió tres cosas: que las comparaciones con el equipo en QPS y QGS sean par a par; un tutorial paso a paso con ventanas flotantes movibles y flechas; y en cada paso un botón «Saber más» que explique las siglas, unidades y conceptos que se ven en la pantalla en ese momento.

**Decisiones.**
- **Par a par.** En QGS, al pulsar «Ver el resultado del equipo», cada mapa del estudiante queda junto al mismo mapa del equipo (fin de diástole, fin de sístole, movimiento, engrosamiento) y su curva junto a la del equipo. Los mapas del equipo se cortaron uno por archivo desde los savescreen de cada fase (`caso7-qgs-<fase>-<mapa>.png`). En QPS, tu mapa junto al mapa que guardó el equipo (sin atenuación) o junto a la referencia con el eje del equipo (con atenuación, porque el equipo no guardó ese mapa), y tus puntajes junto a los del equipo. Las tablas ya iban en columnas lado a lado.
- **Tutorial** (`tutorial7.js`): ventana flotante que se arrastra por su barra (ratón o dedo), flecha curva desde la ventana al control del paso y marco que lo resalta. Tiene pasos por sección del recorrido (control de calidad, registro, caja, orientación, pantallas, mapa polar, QGS). Sigue al estudiante al cambiar de sección y algunos pasos avanzan solos cuando se hace lo pedido: corregir, confirmar el registro, ver el resultado del equipo. Parte solo la primera vez que se abre el caso 7 en el navegador; después se abre con el botón «Tutorial» de la barra. La ventana se ubica sola donde no tape el objetivo, salvo que el estudiante la mueva.
- **«Saber más»** (`glosario.js`): botón arriba de cada sección. Al pulsarlo lee el texto visible de la sección, el paso actual, los rótulos de las imágenes y los términos dibujados dentro de los lienzos y de las pantallas finales. Muestra solo las entradas del glosario que aparecen, en tres grupos: siglas y rótulos, unidades de medida y conceptos. Son 103 entradas, incluidos los rótulos en inglés de las pantallas del equipo.

**Validación.** Recorrido completo con clics en 1180 × 820: el tutorial parte solo con flecha y marco, se arrastra, avanza solo al corregir y sigue al registro; «Saber más» muestra lo de cada pantalla (sinograma y linograma en el control de calidad; TID y SSS en las pantallas; TPD, extensión y falla de máscara en el mapa polar; EDV, fracción de eyección y PER en el QGS); los mapas del equipo quedan a la derecha de los del estudiante en QPS y QGS. Sin errores de JavaScript.

## 2026-09-29 · Caso 7: tutoriales de resultados y «Pantalla final tutorial»

**Contexto.** El docente pidió tutoriales para las pantallas finales, el mapa polar y el mapa QGS, y en las pantallas finales un botón «Pantalla final tutorial» que ponga una flecha en cada concepto y explique qué significa ese resultado, para cada pantalla.

**Decisiones.**
- **Tutoriales más completos** de las tres secciones de resultados: pantallas finales 8 pasos, mapa polar 17 y mapa QGS 13, con cada control y cada figura (menús, aviso, ejes a la vista, deslizadores, receta, tabla, comparación par a par, puntajes, cortes, tabla por segmento, notas; 3D, curva, cada mapa del QGS).
- **«Pantalla final tutorial»**: al dibujar cada pantalla se anota la zona de cada resultado (título, cortes, mapas, reversibilidad, TID, puntajes, recuadros de estrés y reposo, dianas, aviso de falla; en QGS cortes, 3D, cuatro mapas, datos, curva y llenado). El tutorial acepta esas zonas como objetivos y apunta con la flecha dentro de la imagen. Cada paso explica qué es y qué significa el valor del estudiante: segmentos más afectados, reversibilidad y defecto fijo, TID, SSS, SDS y TPD con los rangos de uso habitual en QPS, fracción de eyección, menor y mayor movimiento y engrosamiento por segmento, llenado. Con atenuación se explica que el reposo arrastra la falla de máscara y que su TID no se puede usar. Al cambiar de pantalla en el menú, la explicación sigue con la nueva.
- Los rangos se presentan como de uso habitual y dependientes del protocolo; el primer paso aclara que el informe lo hace el médico con todo el estudio.

**Validación.** Recorrido completo con clics: «Pantalla final tutorial» en QPS sin atenuación (11 resultados), QGS del estrés (10) y QPS con atenuación (12), con flecha y marco en cada uno, explicación de la falla de máscara y del TID con atenuación, y de la fracción de eyección en el QGS. Sin errores de JavaScript.
