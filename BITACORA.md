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
