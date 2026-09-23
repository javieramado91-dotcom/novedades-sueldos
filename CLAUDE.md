# Novedades Sueldos (PWA)

Agenda de novedades para liquidar sueldos del estudio. HTML/CSS/JS sin build: `index.html`, `styles.css`, `app.js`, `sw.js`, `manifest.webmanifest`.

- Repo: https://github.com/javieramado91-dotcom/novedades-sueldos — publicado con GitHub Pages en https://javieramado91-dotcom.github.io/novedades-sueldos/
- Datos en localStorage (clave `novedades-sueldos-v1`); modelo: `clientes`, `empleados`, `novedades[empId][YYYY-MM]={hecho,texto}`, `control[YYYY-MM][cliId]={recibos,confirmado,f931,nota}`, `notas`, `notasMes`.
- `data/seed.enc.json`: datos leídos de los recibos de AGOSTO 2026 (`...\ESTUDIO\SUELDOS\SUELDOS ESTUDIO\AGOSTO 2026`), cifrados AES-GCM/PBKDF2 porque el repo es público (contienen CUIL). Nunca subir datos personales sin cifrar.
- Al cambiar archivos, subir la versión de `CACHE` en `sw.js` para que los celulares tomen la actualización.
- Probar local: `.claude/launch.json` → `npx http-server -p 8765`.
