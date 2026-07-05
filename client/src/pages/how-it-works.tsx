import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, Search, ShieldCheck, Building2,
  ArrowDown, CheckCircle2, XCircle, AlertTriangle,
  Sparkles, FolderPlus, MessageSquare, BarChart3,
  FileText, Zap, Target, Users, Bell,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Adaugă companiile tale",
    icon: Building2,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
    description: "Începe prin a înregistra companiile pe care le consiliezi. Introdu codul CUI și platforma completează automat datele firmei.",
    details: [
      "Datele financiare, angajați, cod CAEN, adresă — se preiau automat din registrele oficiale",
      "Poți adăuga oricâte companii ai nevoie",
      "Cu cât profilul e mai complet, cu atât rezultatele sunt mai precise",
      "Poți regenera profilul oricând dacă datele firmei s-au schimbat",
    ],
  },
  {
    number: "02",
    title: "Explorează apelurile de finanțare",
    icon: Search,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    description: "Catalogul conține apeluri de finanțare actualizate constant. Caută, filtrează și identifică oportunitățile potrivite.",
    details: [
      "Filtre rapide: status (activ/expirat), categorie, program, regiune",
      "Fiecare apel vine cu rezumat, buget, termen limită și documente oficiale",
      "Ghidurile sunt procesate automat — nu trebuie să citești sute de pagini manual",
      "Poți consulta asistentul AI direct pe pagina apelului pentru a pune întrebări despre ghid",
    ],
  },
  {
    number: "03",
    title: "Verifică potrivirea rapidă",
    icon: Target,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    description: "Din Dashboard, Motorul de Potrivire îți arată instant cât de potrivită e fiecare companie pentru fiecare apel, fără să aștepți.",
    details: [
      "Scor calculat automat pe baza: cod CAEN, angajați, cifră de afaceri, tip beneficiar",
      "Sortare după scor, buget sau termen limită",
      "Indicatorul de încredere îți spune cât de sigur e scorul (ridicat / mediu / estimativ)",
      "De aici poți trece direct la analiza AI detaliată cu un singur click",
    ],
  },
  {
    number: "04",
    title: "Analizează eligibilitatea cu AI",
    icon: Sparkles,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    description: 'Din pagina "Eligibilitate", selectează compania și apelul, apoi apasă "Verifică eligibilitatea". AI-ul analizează ghidul oficial și îți dă un verdict clar.',
    details: [
      "Analiza se bazează strict pe conținutul ghidului oficial — nu inventează informații",
      "Primești un verdict clar: ELIGIBIL, NEELIGIBIL, PARȚIAL ELIGIBIL sau DATE INSUFICIENTE",
      "Lista completă de criterii analizate, fiecare cu statusul său",
      "Recomandări concrete despre ce pași ai de urmat",
      "Opțional: doi experți AI oferă perspective complementare (optimist și sceptic)",
    ],
  },
  {
    number: "05",
    title: "Deschide un proiect",
    icon: FolderPlus,
    color: "text-primary",
    bg: "bg-primary/5",
    description: "Dacă compania e eligibilă, deschide un proiect direct din rezultate. Proiectul centralizează tot ce ai nevoie pentru aplicare.",
    details: [
      "Timeline vizual cu etapele proiectului",
      "Checklist de documente necesar — generat automat din ghid",
      "Încarcă, versionează și comentează documente",
      "Invită colaboratori la proiect",
      "Urmărește progresul în timp real",
    ],
  },
];

const features = [
  {
    icon: MessageSquare,
    title: "Asistent AI pe fiecare apel",
    description: "Pune intrebari despre orice apel si primesti raspunsuri bazate pe ghidul oficial: Ce documente trebuie? Care e bugetul maxim? Cine poate aplica?",
  },
  {
    icon: BarChart3,
    title: "Export PDF al analizei",
    description: "Generează un raport PDF complet al verificării de eligibilitate — util pentru prezentarea către client sau pentru dosarul intern.",
  },
  {
    icon: Bell,
    title: "Notificări automate",
    description: "Primești alerte când se apropie termene limită, când expiră documente sau când apar actualizări la apeluri. Configurabil pe email și în aplicație.",
  },
  {
    icon: Users,
    title: "Management clienți multipli",
    description: "Gestionează mai multe companii simultan. Compară eligibilitatea pentru același apel sau identifică cele mai bune oportunități pentru fiecare client.",
  },
  {
    icon: FileText,
    title: "Documente și versionare",
    description: "Încarcă documentele proiectului, păstrează istoricul versiunilor și adaugă comentarii. Totul organizat pe proiect.",
  },
  {
    icon: Target,
    title: "Prospectare ICP",
    description: "Generează profilul clientului ideal pentru fiecare apel. Folosește-l pentru a identifica rapid companii potrivite din portofoliul tău.",
  },
];

const verdictExamples = [
  { verdict: "ELIGIBIL", color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800", icon: CheckCircle2, desc: "Compania îndeplinește criteriile din ghid — poți trece la pregătirea dosarului" },
  { verdict: "PARȚIAL ELIGIBIL", color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800", icon: AlertTriangle, desc: "Unele criterii sunt îndeplinite, altele necesită verificare suplimentară" },
  { verdict: "NEELIGIBIL", color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800", icon: XCircle, desc: "Compania nu îndeplinește criteriile esențiale ale apelului" },
];

const faqItems = [
  {
    question: "Ce date sunt necesare pentru a începe?",
    answer: "Doar codul CUI al companiei. Restul datelor (angajați, cifră de afaceri, CAEN, adresă) se completează automat.",
  },
  {
    question: "De ce scorul meu de potrivire e scăzut?",
    answer: "Scorul depinde de cât de complet e profilul companiei și de cât de specifice sunt criteriile apelului. Asigură-te că ai CAEN-uri secundare completate și date financiare actualizate.",
  },
  {
    question: "Pot rula verificarea de mai multe ori?",
    answer: "Da. Poți rula verificarea oricând, cu întrebări diferite. Platforma detectează automat dacă ai deja un raport recent pentru aceeași combinație companie-apel.",
  },
  {
    question: "Cât de precise sunt rezultatele AI?",
    answer: "Analiza se bazează strict pe conținutul ghidului oficial al apelului. Cu cât ghidul e mai detaliat și profilul companiei mai complet, cu atât rezultatele sunt mai precise. Totuși, analiza are caracter orientativ — decizia finală aparține consultantului.",
  },
  {
    question: "Ce fac dacă un apel nu are ghid încărcat?",
    answer: "Poți pune întrebări pe baza rezumatului apelului, dar rezultatele vor fi mai puțin detaliate. Pentru o analiză completă, asigură-te că ghidul oficial este disponibil pe pagina apelului.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="p-6 space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold" data-testid="text-how-it-works-title">Cum funcționează GRANTED</h1>
          <p className="text-sm text-muted-foreground">
            Ghid practic: de la prima companie la dosarul de finanțare
          </p>
        </div>
      </div>

      <Card className="p-5 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm mb-1">Ce face GRANTED pentru tine?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GRANTED te ajută să identifici rapid ce apeluri de finanțare se potrivesc companiilor tale,
              să verifici eligibilitatea pe baza ghidului oficial și să gestionezi întreg procesul de aplicare
              — de la prima verificare până la depunerea dosarului.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Pașii procesului</h2>

        {steps.map((step, index) => (
          <div key={step.number}>
            <Card className="overflow-hidden" data-testid={`card-step-${step.number}`}>
              <CardHeader className={`pb-3 ${step.bg}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-xs font-bold ${step.color}`}>
                    {step.number}
                  </div>
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm leading-relaxed">{step.description}</p>
                <ul className="space-y-1.5">
                  {step.details.map((detail, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${step.color.replace("text-", "bg-")}`} />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            {index < steps.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowDown className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Tipuri de verdict</h2>
        <p className="text-sm text-muted-foreground">După analiza AI, primești unul din aceste verdicte:</p>
        <div className="grid gap-3">
          {verdictExamples.map((v) => (
            <Card key={v.verdict} className={`p-4 border ${v.bg}`} data-testid={`card-verdict-${v.verdict}`}>
              <div className="flex items-center gap-3">
                <v.icon className={`w-5 h-5 ${v.color}`} />
                <div>
                  <span className={`text-sm font-bold ${v.color}`}>{v.verdict}</span>
                  <p className="text-xs text-muted-foreground">{v.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Ce mai poți face cu GRANTED</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <Card key={i} className="p-4" data-testid={`card-feature-${i}`}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">{f.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          Limite în perioada Beta
        </h2>
        <p className="text-sm text-muted-foreground">Pentru a asigura calitatea serviciului, fiecare cont are limite de utilizare în perioada beta:</p>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="font-medium">Limite zilnice</p>
            <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
              <li>Verificări eligibilitate: 5 / zi</li>
              <li>Potriviri rapide: 20 / zi</li>
              <li>Mesaje chat: 30 / zi</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="font-medium">Limite lunare</p>
            <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
              <li>Verificări date firmă: 10 / lună</li>
              <li>Generare profil AI: 5 / lună</li>
              <li>Generare profil ideal client: 10 / lună</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Consumul curent este vizibil în pagina Setări. Limitele se resetează automat și pot fi ajustate pe măsura evoluției platformei.</p>
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          Întrebări frecvente
        </h2>
        <div className="space-y-3 text-sm">
          {faqItems.map((faq, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50" data-testid={`faq-item-${i}`}>
              <p className="font-medium mb-1">{faq.question}</p>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Important de reținut</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Analiza AI are caracter orientativ și nu înlocuiește consultanța unui specialist</li>
              <li>Calitatea rezultatelor depinde de completitudinea profilului companiei</li>
              <li>Cu cât ghidul oficial e mai detaliat, cu atât analiza e mai precisă</li>
              <li>Poți rula verificarea de mai multe ori, cu întrebări diferite</li>
              <li>Feedback-ul tău ne ajută să îmbunătățim platforma — folosește butonul de feedback oricând</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
