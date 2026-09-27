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
