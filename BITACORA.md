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
