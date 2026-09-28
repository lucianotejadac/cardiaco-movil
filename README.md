# Cardíaco móvil

Versión para teléfono del tutorial de SPECT cardíaco de perfusión, construida paso a paso. Se abre en Chrome de Android desde https://lucianotejadac.github.io/cardiaco-movil/ y trabaja con el mismo ZIP que el estudiante descarga de U-Cursos: la aplicación saca sola el DICOM que necesita, sin descomprimir en el teléfono. Los DICOM no salen del dispositivo.

## Paso 1 (actual)

Caso 1, fase de estrés, fijo. Carga las proyecciones sin corregir (`NM_estres.dcm`) desde el ZIP «Cardiaco …» o desde el archivo suelto, comprueba por el marco de referencia que sea el estrés del caso 1, y muestra el control de calidad de las proyecciones: cine, sinograma por fila, linograma e imagen suma, con la medida automática de movimiento axial. Sin tutorial ni preguntas.

## Cómo está hecho

- `simulador95-engine.js` y `vendor/dicomParser.min.js`: copiados de `spect-lab-95`; `Lab95.read` y `Lab95.spect` leen el DICOM sin tocar la interfaz.
- `cardiaco-casos.js`: el manifiesto compartido con `spect-lab-95` y `simulador-cardiaco` (textos del caso y marcos de referencia).
- `movil.js`: lector ZIP mínimo (directorio central y `DecompressionStream('deflate-raw')`), carga y las cuatro imágenes de control de calidad, con la misma lógica que el bloque de escritorio.
- `movil.css`: una columna, controles táctiles, lienzos al ancho de la pantalla.
- `correccion.js`: corrección automática de movimiento de las proyecciones.
- `registro.js`: FBP y registro SPECT/CT sobre el CT del mismo ZIP.
- `osem-movil.js`: OSEM de referencia 1 × 1 sin correcciones. Usa, copiados tal cual de `spect-lab-95`, `algorithm.js`, `simulador95-osem.js`, `simulador95-psf.js` y `simulador95-pool.js`.

## Pruebas

`prueba-movil-temporal.html` (ignorado por git) carga el ZIP real desde la unión `_datos/` y comprueba las imágenes; se corre con `cdp_run.cjs --movil`, que emula un teléfono de 390 × 844 con pantalla táctil.
