import { Shield } from "lucide-react";
import StaticPageLayout from "@/components/static-page-layout";

export default function PrivacyPolicyPage() {
  return (
    <StaticPageLayout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-[hsl(228,100%,19.6%)]" />
          <h1 className="text-3xl font-serif font-bold" data-testid="text-privacy-page-title">Politica de Confidențialitate</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">Ultima actualizare: 25 martie 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Introducere</h2>
            <p>
              STINDARD LOGIC TECHNOLOGY S.R.L. (CUI: RO47035366, Reg. Com. J40/20803/2022), denumită în continuare „Operatorul", cu sediul social în România, este operatorul de date cu caracter personal colectate prin intermediul platformei GRANTED (accesibilă la adresa granted.ro).
            </p>
            <p>
              Prezenta Politică de Confidențialitate descrie modul în care colectăm, utilizăm, stocăm și protejăm datele dumneavoastră personale, în conformitate cu Regulamentul (UE) 2016/679 (GDPR) și legislația națională aplicabilă.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Datele pe care le colectăm</h2>
            <p>În funcție de modul în care utilizați platforma GRANTED, putem colecta următoarele categorii de date:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Date de identificare:</strong> nume, prenume, adresă de email</li>
              <li><strong>Date de autentificare:</strong> parolă (stocată criptat prin hashing)</li>
              <li><strong>Date despre companie:</strong> denumire, CUI/CIF, cod CAEN principal și secundar, cifra de afaceri, profit, număr de angajați, structură acționariat, date financiare preluate din registrele publice (termene.ro)</li>
              <li><strong>Documente încărcate:</strong> documente necesare proiectelor de finanțare (certificat constatator, bilanț, plan de afaceri etc.)</li>
              <li><strong>Date de utilizare:</strong> activitatea pe platformă, proiecte create, notificări, interacțiuni cu motorul de potrivire</li>
              <li><strong>Date tehnice:</strong> adresă IP, tip browser, sistem de operare, cookies</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Scopul prelucrării datelor</h2>
            <p>Datele dumneavoastră personale sunt prelucrate în următoarele scopuri:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Crearea și gestionarea contului de utilizator pe platformă</li>
              <li>Verificarea identității companiei prin interogarea registrelor publice</li>
              <li>Evaluarea eligibilității companiei pentru programe de finanțare</li>
              <li>Generarea scorurilor de potrivire cu apelurile de finanțare active</li>
              <li>Analiza automată (AI) a eligibilității pe baza ghidurilor de finanțare</li>
              <li>Gestionarea documentelor și monitorizarea progresului proiectelor</li>
              <li>Trimiterea de notificări și alerte (expirare documente, termene limită)</li>
              <li>Comunicări tranzacționale (verificare email, resetare parolă, invitații colaboratori)</li>
              <li>Îmbunătățirea și dezvoltarea platformei</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Temeiul legal al prelucrării</h2>
            <p>Prelucrarea datelor se bazează pe:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Consimțământul dumneavoastră</strong> (art. 6 alin. 1 lit. a GDPR) — acordat la crearea contului și acceptarea prezentei politici</li>
              <li><strong>Executarea contractului</strong> (art. 6 alin. 1 lit. b GDPR) — pentru furnizarea serviciilor platformei</li>
              <li><strong>Interesul nostru legitim</strong> (art. 6 alin. 1 lit. f GDPR) — pentru securitate, prevenirea fraudei și îmbunătățirea serviciilor</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Partajarea datelor cu terți</h2>
            <p>Datele dumneavoastră pot fi partajate cu următorii terți, exclusiv în scopurile menționate:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase Inc.</strong> — furnizor de baze de date și stocare fișiere (infrastructură cloud)</li>
              <li><strong>OpenAI LLC</strong> — pentru analiza AI de eligibilitate (datele companiei sunt transmise anonim pentru generarea verdictelor)</li>
              <li><strong>Resend Inc.</strong> — serviciu de trimitere email-uri tranzacționale</li>
              <li><strong>Google LLC</strong> — serviciu reCAPTCHA v3 pentru protecție anti-spam; Google Analytics 4 pentru statistici anonime de utilizare (doar cu consimțământul dumneavoastră)</li>
              <li><strong>termene.ro</strong> — verificarea datelor publice ale companiei pe baza CUI</li>
            </ul>
            <p>Nu vindem și nu partajăm datele dumneavoastră cu terți în scopuri de marketing.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Durata stocării</h2>
            <p>
              Datele personale sunt păstrate pe toată durata existenței contului dumneavoastră pe platformă. La cererea de ștergere a contului, datele vor fi eliminate în termen de 30 de zile, cu excepția celor pentru care există obligații legale de păstrare.
            </p>
            <p>
              Documentele încărcate sunt stocate pe durata proiectului activ și pot fi șterse individual de către utilizator în orice moment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Drepturile dumneavoastră</h2>
            <p>Conform GDPR, aveți următoarele drepturi:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Dreptul de acces</strong> — puteți solicita o copie a datelor personale pe care le deținem</li>
              <li><strong>Dreptul la rectificare</strong> — puteți corecta datele inexacte sau incomplete</li>
              <li><strong>Dreptul la ștergere</strong> — puteți solicita ștergerea datelor personale</li>
              <li><strong>Dreptul la restricționarea prelucrării</strong> — puteți solicita limitarea prelucrării în anumite situații</li>
              <li><strong>Dreptul la portabilitatea datelor</strong> — puteți solicita transferul datelor într-un format structurat</li>
              <li><strong>Dreptul la opoziție</strong> — vă puteți opune prelucrării datelor în anumite scopuri</li>
              <li><strong>Dreptul de a depune plângere</strong> — la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Securitatea datelor</h2>
            <p>
              Implementăm măsuri tehnice și organizatorice adecvate pentru protecția datelor dumneavoastră, inclusiv:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Criptarea parolelor prin bcrypt (hashing cu salt)</li>
              <li>Conexiuni securizate SSL/TLS pentru toate transferurile de date</li>
              <li>Stocare securizată a fișierelor prin Supabase Storage</li>
              <li>Sesiuni de autentificare cu expirare automată</li>
              <li>Protecție anti-spam prin Google reCAPTCHA v3</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Transferul datelor în afara UE</h2>
            <p>
              Unii dintre furnizorii noștri de servicii (Supabase, OpenAI, Resend, Google) pot prelucra date în afara Spațiului Economic European. În aceste cazuri, ne asigurăm că transferul se realizează în baza unor garanții adecvate, conform capitolului V din GDPR (clauze contractuale standard, decizii de adecvare sau alte mecanisme aprobate).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
            <p>
              Pentru orice întrebări sau solicitări legate de prelucrarea datelor personale, ne puteți contacta la:
            </p>
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
