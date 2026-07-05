# granted.ro — Frontend Dev Setup

Acest pachet conține DOAR frontend-ul (folderul `client/`). Backend-ul
(API, bază de date, integrări plăți/facturare) rulează separat și NU
este inclus. Nu ai nevoie de niciun secret ca să lucrezi la UI.

## Pornire

1. Instalează dependențele:
       npm install

2. Copiază `.env.example` în `.env` și cere-i lui George un URL de
   STAGING pentru API (nu producție):
       cp .env.example .env
       # editează STAGING_API_URL=...

3. Pornește doar frontend-ul (Vite + proxy către staging):
       npx vite --config vite.frontend.config.ts

   UI-ul rulează pe http://localhost:5173
   Toate apelurile /api/... sunt trimise automat către STAGING_API_URL.

## Note
- NU folosi `npm run dev` — acela pornește și backend-ul (nu e inclus).
- Frontend-ul nu citește variabile de mediu proprii; toate cheile sunt
  pe server.
- Modificările le faci în `client/src/`. Tipurile comune sunt în `shared/`.

## Sarcina și predarea modificărilor
- Sarcina curentă: `TASK.md`.
- Cum faci commit/push și predai lucrul înapoi: `CONTRIBUTING.md` — pe
  scurt, branch + Pull Request pe GitHub, niciodată push direct pe `main`.
