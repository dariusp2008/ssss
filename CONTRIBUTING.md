# Cum trimiti modificarile

Acest repo e un EXTRACT (doar `client/` + `shared/`) dintr-un monorepo mai
mare care contine si backend-ul (Express + baza de date), gazduit pe
Replit. Codul de-aici NU se deployeaza direct de aici — George il
integreaza manual in monorepo dupa ce revizuieste PR-ul. De-aia workflow-ul
de mai jos (branch + PR, nu push pe `main`) conteaza: e singurul punct
unde modificarile devin vizibile si usor de inteles inainte sa ajunga in
proiectul real.

## Workflow

1. Porneste de la `main` la zi:
       git checkout main && git pull
2. Creeaza un branch cu nume descriptiv:
       git checkout -b feature/nume-scurt      # sau fix/nume-scurt
3. Fa modificarile in `client/src/` (vezi mai jos despre `shared/`).
4. Commit-uri mici, mesaje care spun CE si DE CE — nu "fix", "update",
   "modificari".
5. Push pe branch (NU pe `main`):
       git push -u origin feature/nume-scurt
6. Deschide un Pull Request pe GitHub catre `main`, cu descrierea de mai
   jos.
7. Nu face merge singur. George revizuieste, integreaza in monorepo,
   testeaza cu backend-ul real, apoi il face live prin fluxul Replit
   existent — vezi "Ce se intampla dupa PR".

## Ce pui in descrierea PR-ului

- **Ce s-a schimbat** (fisiere/comportament) si **de ce** (ce sarcina/context).
- **Cum ai testat** — pasii urmati; pune un screenshot sau un GIF scurt
  daca schimbarea e vizuala.
- Daca ai atins **`shared/`** — semnaleaza EXPLICIT, in bold, la inceputul
  descrierii. `shared/` e folosit si de backend; o schimbare acolo poate
  cere modificari pe server pe care tu nu le vezi din acest repo.
- Daca ai adaugat o **dependinta noua** in `package.json` — semnaleaz-o
  EXPLICIT. Trebuie adaugata manual si in monorepo-ul complet, nu se
  sincronizeaza automat.

## Ce sa NU faci

- Nu modifica `vite.frontend.config.ts`, `.env.example` sau scripturile
  din `package.json` fara sa intrebi — sunt parte din mecanismul de
  izolare fata de backend.
- Nu adauga secrete/chei API in cod sau in commit-uri.
- Nu face push direct pe `main` — intotdeauna branch + PR, chiar si
  pentru schimbari mici.

## Testare

Majoritatea paginilor cer autentificare (`dashboard`, `companies`,
`projects`, `my-account` etc.) — cere-i lui George un cont de test pe
STAGING daca sarcina ta atinge ceva din spatele login-ului. Paginile
publice (`landing`, `pricing`, `how-it-works`, `news`, politici) sunt
testabile fara cont.

## Ce se intampla dupa PR

1. George revizuieste diff-ul pe GitHub (de-aia conteaza un PR clar, nu un
   push mut pe `main`).
2. Odata aprobat, integreaza manual schimbarile in monorepo-ul complet
   (`client/`+`shared/` din proiectul Replit), langa codul de backend.
3. Testeaza acolo cu backend-ul si baza de date reale.
4. Il face live prin fluxul Replit existent (Publish = mediul de test;
   Sync git = ce ajunge pe productie).

Din cauza asta, integrarea nu e instanta — o modificare aprobata poate
dura pana devine vizibila pe granted.ro. Daca ceva e urgent, spune-o
explicit in PR.
