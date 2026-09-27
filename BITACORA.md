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
