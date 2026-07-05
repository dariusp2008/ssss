import { Cookie } from "lucide-react";
import StaticPageLayout from "@/components/static-page-layout";

export default function CookiePolicyPage() {
  return (
    <StaticPageLayout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Cookie className="w-8 h-8 text-[hsl(228,100%,19.6%)]" />
          <h1 className="text-3xl font-serif font-bold" data-testid="text-cookie-page-title">Politica de Cookie-uri</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">Ultima actualizare: 25 martie 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Ce sunt cookie-urile?</h2>
            <p>
              Cookie-urile sunt fișiere text de mici dimensiuni plasate pe dispozitivul dumneavoastră (computer, telefon mobil, tabletă) atunci când accesați un site web. Acestea permit site-ului să rețină informații despre vizita dumneavoastră, cum ar fi preferințele de limbă și alte setări.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Cookie-uri utilizate de GRANTED</h2>
            <p>Platforma GRANTED utilizează următoarele tipuri de cookie-uri:</p>

            <div className="bg-muted/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Cookie</th>
                    <th className="text-left p-3 font-semibold">Tip</th>
                    <th className="text-left p-3 font-semibold">Scop</th>
                    <th className="text-left p-3 font-semibold">Durată</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 font-mono text-xs">connect.sid</td>
                    <td className="p-3">Strict necesar</td>
                    <td className="p-3">Sesiunea de autentificare — menține utilizatorul conectat</td>
                    <td className="p-3">7 zile</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-mono text-xs">_grecaptcha</td>
                    <td className="p-3">Funcțional</td>
                    <td className="p-3">Google reCAPTCHA v3 — protecție anti-spam și anti-bot</td>
                    <td className="p-3">6 luni</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-mono text-xs">sidebar:state</td>
                    <td className="p-3">Preferințe</td>
                    <td className="p-3">Memorarea stării sidebar-ului (deschis/închis)</td>
                    <td className="p-3">Sesiune</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-mono text-xs">_ga / _ga_*</td>
                    <td className="p-3">Analytics</td>
                    <td className="p-3">Google Analytics 4 — statistici anonime de utilizare a platformei</td>
                    <td className="p-3">2 ani</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-xs">granted_analytics_consent</td>
                    <td className="p-3">Strict necesar</td>
                    <td className="p-3">Memorarea consimțământului pentru cookie-uri de analytics</td>
                    <td className="p-3">Permanent (localStorage)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Clasificarea cookie-urilor</h2>

            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-foreground">Cookie-uri strict necesare</h3>
                <p>
                  Aceste cookie-uri sunt esențiale pentru funcționarea Platformei. Fără ele, nu vă puteți autentifica sau utiliza serviciile. Nu necesită consimțământul dumneavoastră conform legislației în vigoare.
                </p>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-foreground">Cookie-uri funcționale</h3>
                <p>
                  Utilizate pentru funcționalități de securitate (reCAPTCHA). Acestea ajută la protejarea Platformei împotriva accesului automatizat abuziv.
                </p>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-foreground">Cookie-uri de preferințe</h3>
                <p>
                  Memorează preferințele dumneavoastră de utilizare (starea sidebar-ului). Acestea îmbunătățesc experiența de utilizare, dar nu sunt esențiale.
                </p>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-foreground">Cookie-uri de analytics</h3>
                <p>
                  Utilizăm Google Analytics 4 pentru a colecta statistici anonime despre modul în care este utilizată platforma: pagini vizitate, durata sesiunilor, surse de trafic. Aceste date ne ajută să îmbunătățim serviciile. Cookie-urile de analytics sunt activate doar cu consimțământul dumneavoastră explicit, prin banner-ul de cookie-uri afișat la prima vizită.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Cookie-uri terțe</h2>
            <p>
              Platforma GRANTED utilizează următoarele servicii terțe care pot seta propriile cookie-uri:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google reCAPTCHA v3</strong> — protecție anti-spam și anti-bot. Cookie-urile sunt gestionate de Google.</li>
              <li><strong>Google Analytics 4</strong> — colectarea de statistici anonime de utilizare (doar cu consimțământul dumneavoastră). Cookie-urile sunt gestionate de Google.</li>
            </ul>
            <p>
              Aceste cookie-uri sunt supuse <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[hsl(228,100%,30%)] hover:underline">Politicii de Confidențialitate Google</a>.
            </p>
            <p>
              <strong>Nu utilizăm cookie-uri de marketing sau publicitate.</strong>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Gestionarea cookie-urilor</h2>
            <p>
              Puteți gestiona și șterge cookie-urile prin setările browserului dumneavoastră. Vă rugăm să rețineți că dezactivarea cookie-urilor strict necesare poate afecta funcționarea Platformei.
            </p>
            <p>Instrucțiuni pentru gestionarea cookie-urilor în principalele browsere:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[hsl(228,100%,30%)] hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/ro/kb/activarea-si-dezactivarea-cookie-urilor" target="_blank" rel="noopener noreferrer" className="text-[hsl(228,100%,30%)] hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.microsoft.com/ro-ro/microsoft-edge/ștergerea-cookie-urilor-în-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-[hsl(228,100%,30%)] hover:underline">Microsoft Edge</a></li>
              <li><a href="https://support.apple.com/ro-ro/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[hsl(228,100%,30%)] hover:underline">Safari</a></li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Modificări ale politicii</h2>
            <p>
              Operatorul își rezervă dreptul de a actualiza prezenta Politică de Cookie-uri. Orice modificare va fi publicată pe această pagină, cu actualizarea datei de revizuire.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
            <p>Pentru întrebări privind utilizarea cookie-urilor, ne puteți contacta la:</p>
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
