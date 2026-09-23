# Novedades Sueldos

Agenda de novedades para liquidar sueldos (app web instalable / PWA).

- **Control**: planilla mensual por empleador (Recibos · Confirmado · F931 y comprobantes) con notas.
- **Novedades**: novedades del mes por empleado, marca de liquidado y avisos (altas, bajas, aniversarios de antigüedad, SAC).
- **Fichas**: ficha anual por empleado, igual a la planilla en papel, imprimible.
- **Empleados**: alta/baja/edición de empleadores y empleados, respaldo (exportar/importar JSON).
- **Notas**: notas generales (conceptos, códigos de VEP, vencimientos).

Los datos se guardan sólo en el dispositivo (localStorage) y la app funciona sin conexión.
Los datos iniciales (recibos de agosto 2026) están cifrados en `data/seed.enc.json` y se cargan con contraseña.

## Instalar en el celular
- **Android (Chrome)**: abrir el link → menú ⋮ → *Instalar app* / *Agregar a pantalla de inicio*.
- **iPhone (Safari)**: abrir el link → Compartir → *Agregar a inicio*.
