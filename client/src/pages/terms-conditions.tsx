import { FileText } from "lucide-react";
import StaticPageLayout from "@/components/static-page-layout";

export default function TermsConditionsPage() {
  return (
    <StaticPageLayout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-[hsl(228,100%,19.6%)]" />
          <h1 className="text-3xl font-serif font-bold" data-testid="text-terms-page-title">Termeni și Condiții</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">Ultima actualizare: 26 februarie 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Definiții</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>„Platforma"</strong> — aplicația web GRANTED, accesibilă la adresa granted.ro, operată de STINDARD LOGIC TECHNOLOGY S.R.L.</li>
              <li><strong>„Operatorul"</strong> — STINDARD LOGIC TECHNOLOGY S.R.L. (CUI: RO47035366, Reg. Com. J40/20803/2022), societate înregistrată în România</li>
              <li><strong>„Utilizatorul"</strong> — orice persoană fizică sau juridică care accesează și utilizează Platforma</li>
              <li><strong>„Serviciile"</strong> — funcționalitățile oferite de Platformă, inclusiv evaluarea eligibilității, potrivirea cu programe de finanțare, gestionarea documentelor și proiectelor</li>
              <li><strong>„Contul"</strong> — spațiul personal al Utilizatorului pe Platformă, creat prin înregistrare cu email și parolă</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Acceptarea termenilor</h2>
            <p>
              Prin accesarea și utilizarea Platformei GRANTED, Utilizatorul confirmă că a citit, înțeles și acceptat prezentii Termeni și Condiții. Dacă nu sunteți de acord cu acești termeni, vă rugăm să nu utilizați Platforma.
            </p>
            <p>
              Operatorul își rezervă dreptul de a modifica acești termeni în orice moment. Utilizatorii vor fi notificați cu privire la modificările semnificative. Continuarea utilizării Platformei după notificare constituie acceptarea noilor termeni.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Descrierea serviciilor</h2>
            <p>Platforma GRANTED oferă următoarele servicii:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Pre-Scorare:</strong> Verificarea datelor companiei prin CUI și evaluarea profilului economic</li>
              <li><strong>Motor de Potrivire:</strong> Identificarea automată a programelor de finanțare compatibile cu profilul companiei</li>
              <li><strong>Analiză AI de Eligibilitate:</strong> Evaluarea automată a eligibilității pe baza ghidurilor de finanțare, utilizând inteligență artificială</li>
              <li><strong>Gestionare Proiecte:</strong> Urmărirea progresului aplicațiilor pentru finanțare, inclusiv documente, termene și colaboratori</li>
              <li><strong>Catalog Apeluri:</strong> Afișarea apelurilor de finanțare active, cu detalii și filtre de căutare</li>
              <li><strong>Notificări:</strong> Alerte automate pentru termene limită, expirare documente și actualizări ale proiectelor</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Contul de utilizator</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pentru a accesa Serviciile, Utilizatorul trebuie să creeze un Cont furnizând o adresă de email validă și o parolă</li>
              <li>Utilizatorul este responsabil pentru menținerea confidențialității credențialelor de acces</li>
              <li>Adresa de email trebuie verificată prin linkul primit pentru activarea Contului</li>
              <li>Utilizatorul se obligă să furnizeze informații corecte și actuale</li>
              <li>Operatorul poate suspenda sau șterge Conturile care încalcă acești termeni</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Obligațiile utilizatorului</h2>
            <p>Utilizatorul se obligă:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Să utilizeze Platforma exclusiv în scopuri legale și conform destinației acesteia</li>
              <li>Să nu încerce accesarea neautorizată a sistemelor sau datelor altor utilizatori</li>
              <li>Să nu încarce conținut ilegal, defăimător sau care încalcă drepturile terților</li>
              <li>Să nu utilizeze instrumente automate (boți, scrapere) pentru accesarea Platformei fără acordul Operatorului</li>
              <li>Să nu reproducă, distribuie sau modifice conținutul Platformei fără autorizare</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Proprietate intelectuală</h2>
            <p>
              Toate drepturile de proprietate intelectuală asupra Platformei, inclusiv dar fără a se limita la design, cod sursă, algoritmi, baze de date, texte și elemente grafice, aparțin Operatorului.
            </p>
            <p>
              Utilizatorul păstrează drepturile asupra documentelor și datelor pe care le încarcă pe Platformă. Prin încărcarea acestora, Utilizatorul acordă Operatorului o licență limitată, neexclusivă, de a le procesa în scopul furnizării Serviciilor.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Limitarea răspunderii</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Platforma oferă informații orientative privind eligibilitatea pentru programe de finanțare. Rezultatele analizelor nu constituie consultanță juridică sau financiară</li>
              <li>Operatorul nu garantează obținerea finanțării pe baza rezultatelor furnizate de Platformă</li>
              <li>Scorurile de potrivire și analizele AI sunt generate automat și pot conține inexactități</li>
              <li>Operatorul nu răspunde pentru pierderi directe sau indirecte rezultate din utilizarea sau imposibilitatea utilizării Platformei</li>
              <li>Operatorul depune eforturi rezonabile pentru menținerea disponibilității Platformei, dar nu garantează funcționarea neîntreruptă</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Datele companiei</h2>
            <p>
              Datele companiei preluate din registrele publice (prin serviciul termene.ro) sunt informații publice disponibile conform legii. Platforma le utilizează exclusiv pentru evaluarea eligibilității.
            </p>
            <p>
              Operatorul nu răspunde pentru exactitatea datelor preluate din surse terțe. Utilizatorul are responsabilitatea de a verifica și actualiza informațiile despre compania sa.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Rezilierea</h2>
            <p>
              Utilizatorul poate solicita ștergerea Contului în orice moment prin contactarea Operatorului. La ștergerea Contului, datele personale vor fi eliminate conform Politicii de Confidențialitate.
            </p>
            <p>
              Operatorul poate rezilia accesul Utilizatorului în cazul încălcării prezentilor Termeni, fără notificare prealabilă în cazurile grave.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Legea aplicabilă și jurisdicția</h2>
            <p>
              Prezentii Termeni și Condiții sunt guvernați de legislația română. Orice litigiu va fi soluționat de instanțele competente din România.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
            <p>Pentru orice întrebări legate de acești termeni, ne puteți contacta la:</p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p><strong>STINDARD LOGIC TECHNOLOGY S.R.L.</strong></p>
              <p>CUI: RO47035366 | Reg. Com. J40/20803/2022</p>
            </div>
          </section>
        </div>
      </div>
    </StaticPageLayout>
  );
}
