# granted-frontend

Frontend-ul (UI) platformei granted.ro — extras pentru dezvoltare izolată.
Backend-ul (API, DB, plăți, facturare) rulează separat și NU este inclus.

## Pornire rapidă
Vezi `DEV_SETUP.md`. Pe scurt:

    npm install
    cp .env.example .env      # cere URL de staging pentru API
    npx vite --config vite.frontend.config.ts

UI pe http://localhost:5173 · apelurile /api merg prin proxy la staging.

## Ce e important
- Modificările se fac în `client/src/`.
- Nu folosi `npm run dev` (pornește backend-ul, care nu e aici).
- Nu ai nevoie de secrete: frontend-ul nu citește variabile proprii.

## Sarcina curentă
Vezi `TASK.md`.

## Cum trimiți modificările
Vezi `CONTRIBUTING.md` — branch + Pull Request pe GitHub, nu push pe
`main`. Explică și de ce (repo-ul ăsta e doar un extract de UI; George
integrează manual PR-ul în proiectul complet).
