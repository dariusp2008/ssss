import {
  Newspaper, CalendarDays, CheckCircle2, Sparkles, Shield, Mail, Globe, Database,
  FileUp, Pencil, Trash2, FolderOpen, MessageSquare, History, Users, BarChart3,
  GitBranch, Filter, Bell, Search, Building2, Landmark, ArrowLeftRight, Download,
  Layers, Brain, RefreshCw, Zap, FileText, TrendingUp, ShieldCheck,
  UserCog, Camera, Lock, LogOut, KeyRound, MessageCircle, ShieldAlert,
  Settings, ToggleRight, Info, Cookie, ShieldEllipsis, Cpu,
  Network, BookOpen, ShieldBan, Target, ScrollText, Radio, ListFilter, BotMessageSquare,
  AlertTriangle, Activity, Star, Footprints, Coins, CreditCard, UserCheck, RotateCcw,
  HeadphonesIcon, Phone, DatabaseZap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface UpdateItem {
  date: string;
  title: string;
  description: string;
  type: "feature" | "improvement" | "fix";
  icon: typeof Sparkles;
}

const updates: UpdateItem[] = [
  {
    date: "30 Martie 2026",
    title: "Confirmare credite, calendar îmbunătățit și corectări diacritice",
    description:
      "Toate acțiunile care consumă credite (eligibilitate, generare ICP, analiză conformitate) afișează acum un dialog de confirmare cu soldul curent înainte de execuție. Calendarul arată puncte colorate pe zilele cu evenimente pentru vizibilitate rapidă. Catalogul de apeluri afișează un badge 'Ghid disponibil' când există ghid oficial indexat. Cookie-ul Google reCAPTCHA a fost reclasificat ca esențial/securitate. Peste 50 de texte din interfață au fost corectate cu diacritice românești corecte (ă, î, â, ș, ț). Componenta ErrorBoundary protejează acum toate paginile încărcate lazy.",
    type: "improvement",
    icon: ShieldCheck,
  },
  {
    date: "18 Martie 2026",
    title: "Stabilitate PROD — serializare importuri n8n si pool DB optimizat",
    description:
      "Importurile de apeluri de finantare de la n8n se executa acum secvential (unul cate unul) in loc de simultan. Anterior, cand n8n trimitea 10+ apeluri rapid, toate se executau in paralel si epuizau conexiunile disponibile catre baza de date (eroare MaxClientsInSessionMode), blocand celelalte functionalitati (eligibilitate, notificari, dashboard). Pool-ul de conexiuni a fost marit de la 3 la 5 pentru productie, iar timeout-urile au fost optimizate (idle: 10s, connection: 5s) pentru eliberarea mai rapida a conexiunilor neutilizate. Niciun import nu se pierde — cererile asteapta la coada si se proceseaza in ordine.",
    type: "fix",
    icon: DatabaseZap,
  },
  {
    date: "18 Martie 2026",
    title: "Mesaje clare pentru credite insuficiente pe toate paginile",
    description:
      "Toate actiunile care consuma credite (eligibilitate, profil AI companie, match engine, generare ICP, verificare conformitate, RAG chat) afiseaza acum un toast dedicat 'Credite insuficiente' cu mesajul descriptiv de la server cand utilizatorul nu are suficiente credite. Anterior, eroarea aparea ca un mesaj generic 'Eroare'. In RAG chat, mesajul apare direct in conversatie.",
    type: "improvement",
    icon: Coins,
  },
  {
    date: "18 Martie 2026",
    title: "Pagina Abonament accesibila din sidebar",
    description:
      "Link-ul catre pagina de Abonament (/subscription) a fost adaugat in meniul lateral, intre Notificari si Datele mele. Anterior, pagina exista dar era accesibila doar prin click pe badge-ul de credite din sidebar.",
    type: "fix",
    icon: CreditCard,
  },
  {
    date: "18 Martie 2026",
    title: "Fix Admin — planuri si credite vizibile la utilizatori",
    description:
      "In panoul de administrare, tab-ul Utilizatori afisa o linie (—) in loc de numele planului si soldul de credite pentru toti utilizatorii. Cauza: frontend-ul citea campuri in format snake_case (plan_name, credit_balance) in timp ce backend-ul returna camelCase (planName, creditBalance). Corectia aliniaza frontend-ul la formatul real al datelor. De asemenea, butonul 'Schimba plan' pre-selecteaza acum corect planul curent al utilizatorului.",
    type: "fix",
    icon: Users,
  },
  {
    date: "18 Martie 2026",
    title: "Buton Stergere cont vizibil pentru toti utilizatorii",
    description:
      "Sectiunea 'Stergere cont' din pagina Setari era ascunsa pentru utilizatorii cu rol super_admin, desi pagina 'Datele mele' facea referire la ea. Acum butonul este vizibil pentru toti utilizatorii. Backend-ul pastreaza protectia: contul de super admin nu poate fi sters efectiv (mesaj explicit de blocare).",
    type: "fix",
    icon: Trash2,
  },
  {
    date: "18 Martie 2026",
    title: "Compatibilitate PROD — endpoint /api/auth/my-data",
    description:
      "Endpointul /api/auth/my-data a fost convertit de la Drizzle ORM la SQL direct (pool.query) pentru a evita erori 500 pe PROD cauzate de nepotriviri intre schema Drizzle si structura reala a bazei de date. Toate query-urile pentru user, companii, proiecte, documente, rapoarte si audit log folosesc acum SQL cu alias-uri camelCase explicite.",
    type: "fix",
    icon: DatabaseZap,
  },
  {
    date: "10 Martie 2026",
    title: "Chatbot de suport AI integrat cu feedback",
    description:
      "Widget nou de suport in coltul din dreapta jos al platformei, disponibil pe toate paginile autentificate. Combina doua functionalitati intr-un singur widget: (1) Chat suport — asistent AI bazat pe GPT-4o-mini care raspunde la intrebari despre platforma (cum adaug o companie, ce este Match Engine-ul, cum functioneaza eligibilitatea etc.), cu streaming in timp real si intrebari starter sugerate; (2) Trimite feedback — formular pentru sugestii, probleme sau intrebari catre echipa GRANTED. Chatbot-ul se bazeaza pe o baza de cunostinte interna care acopera toate functionalitatile platformei. Endpoint: POST /api/support-chat (SSE streaming, gratuit, fara consum de credite). Inlocuieste vechiul widget de feedback.",
    type: "feature",
    icon: HeadphonesIcon,
  },
  {
    date: "10 Martie 2026",
    title: "Sincronizare scheme baze de date DEV si PROD",
    description:
      "Schemele bazelor de date Supabase DEV si PROD au fost sincronizate complet. 6 tabele noi adaugate in PROD: conformity_reports, credit_costs, credit_packages, credit_transactions, subscription_plans, user_subscriptions. 6 coloane noi pe tabela users: consent_ai_processing, consent_email_marketing, consent_third_party_sharing, credit_balance, stripe_customer_id, subscription_plan_id. Datele de referinta (3 planuri, 8 costuri credite, 3 pachete) au fost copiate din DEV in PROD.",
    type: "improvement",
    icon: DatabaseZap,
  },
  {
    date: "10 Martie 2026",
    title: "Formular de contact public in footer",
    description:
      "Componenta reutilizabila ContactFormDialog adaugata in footer-ul paginilor publice (landing page, politica de confidentialitate, termeni si conditii, cookie policy). Formularul colecteaza: nume, email, companie, telefon si mesaj. Endpoint public POST /api/contact (fara autentificare necesara). Emailurile sunt trimise catre echipa GRANTED via Resend. Footer-ul redesenat cu 4 coloane: Logo, Platforma, Legal si Contact.",
    type: "feature",
    icon: Phone,
  },
  {
    date: "10 Martie 2026",
    title: "Conformitate GDPR avansata — Datele mele si consimtaminte granulare",
    description:
      "Pagina noua 'Datele mele' (/my-data) afiseaza toate datele personale stocate pe platforma: profil, companii, proiecte, documente, rapoarte. Include 3 toggle-uri de consimtamant GDPR: procesare AI (obligatoriu pentru functionalitati AI), comunicari email marketing si partajare date cu terte parti. Buton de export GDPR self-service — descarca un PDF complet cu toate datele tale, fara a fi nevoie de admin. Sectiune cu politica de retentie a datelor. Middleware requireAiConsent blocheaza toate operatiunile AI daca utilizatorul nu a consimtit. Audit logging pe toate descarcarile de documente (proiecte, ghiduri, admin).",
    type: "feature",
    icon: UserCheck,
  },
  {
    date: "10 Martie 2026",
    title: "Corectie consum credite — match engine gratuit pe dashboard",
    description:
      "Motorul de potrivire de pe dashboard consuma acum credite doar la apasarea explicita a butonului 'Recalculeaza', nu la fiecare incarcare a paginii. Creditele consumate incorect au fost restabilite automat pentru utilizatorii afectati. Butonul 'Recalculeaza' afiseaza tooltip cu costul in credite si da eroare clara daca nu sunt suficiente.",
    type: "fix",
    icon: RotateCcw,
  },
  {
    date: "9 Martie 2026",
    title: "Sistem de abonamente si credite",
    description:
      "Model de monetizare cu 3 planuri (Free, Standard, Business) si sistem de credite pay-as-you-go. Fiecare operatiune AI consuma un numar configurabil de credite (ex: eligibilitate = 3, conformitate = 5, RAG chat = 1). Selectie plan la inregistrare. Pagina /subscription cu sold, plan curent, tabel costuri si istoric tranzactii. Badge credite in sidebar. Resetare lunara automata. Admin: tab-uri dedicate pentru gestionare planuri, costuri, pachete credite si alocari per utilizator. Limite de plan pentru numarul de companii si proiecte. Arhitectura pregatita pentru integrare Stripe.",
    type: "feature",
    icon: CreditCard,
  },
  {
    date: "8 Martie 2026",
    title: "Terminologie actualizata — programe de finantare",
    description:
      "Toata terminologia din platforma a fost actualizata: 'fonduri UE', 'fonduri europene' si 'finantare europeana' au fost inlocuite cu 'programe de finantare' peste tot (interfata, backend, meta tag-uri, date seed). Reflecta faptul ca platforma acopera atat programe europene cat si nationale.",
    type: "improvement",
    icon: FileText,
  },
  {
    date: "7 Martie 2026",
    title: "Analiza AI documente — verificare conformitate cu cerinte apel",
    description:
      "Documente incarcate in proiecte pot fi acum analizate AI contra cerintelor apelului de finantare. Returneaza verdict (conform/partial/neconform), scor 0-100, lista criterii verificate, elemente lipsa si recomandari. Badge-uri vizuale pe cardurile documentelor. Tab dedicat 'Analiza documente' cu istoricul complet al verificarilor si vizualizare detaliata. Cota zilnica: 10 verificari.",
    type: "feature",
    icon: ShieldCheck,
  },
  {
    date: "7 Martie 2026",
    title: "Costuri per utilizator in panoul admin",
    description:
      "Tab nou in panoul de administrare care arata costurile detaliate per utilizator: consum OpenAI (tokeni intrare/iesire, cost estimat) si interogari termene.ro. Permite monitorizarea cheltuielilor si identificarea utilizatorilor cu consum ridicat.",
    type: "feature",
    icon: Coins,
  },
  {
    date: "5 Martie 2026",
    title: "Disclaimer legal AI pe toate paginile cu analiza",
    description:
      "Componenta AiDisclaimer afisata pe pagina de eligibilitate, dashboard (motor potrivire), chat RAG si pagina de detalii apel (prospectare/ICP). Text legal in romana care avertizeaza ca analiza AI e orientativa, nu consultanta juridica. Inclus si in footer-ul exportului PDF.",
    type: "feature",
    icon: AlertTriangle,
  },
  {
    date: "5 Martie 2026",
    title: "Feedback structurat cu survey-uri beta",
    description:
      "Tabelul feedback extins cu coloane category, rating (1-5) si session_count. Doua moduri de survey: onboarding (5 intrebari dupa prima saptamana) si post-sesiune (rating + checkboxuri dupa 3+ sesiuni). Survey-urile sunt non-intruzive, dismissable, tracked prin localStorage. Admin-ul afiseaza categoria si rating-ul cu stele.",
    type: "feature",
    icon: Star,
  },
  {
    date: "5 Martie 2026",
    title: "Dashboard metrici beta pentru administratori",
    description:
      "Tab nou Metrici Beta in panoul admin cu: utilizatori activi (7 zile), medie companii/utilizator, medie potriviri/utilizator, rating mediu feedback, medie proiecte/utilizator, medie verificari eligibilitate/utilizator. Tabel cu evenimente prima data si calcul time-to-value. Endpoint: GET /api/admin/beta-metrics.",
    type: "feature",
    icon: Activity,
  },
  {
    date: "5 Martie 2026",
    title: "Tracking journey utilizator prin audit log",
    description:
      "Detectie automata a evenimentelor prima data: first_company_added, first_match_run, first_eligibility_check, first_project_created, first_rag_chat. Inregistrate in audit_log cu metadata relevanta. Permite calcularea time-to-value si identificarea punctelor de blocare.",
    type: "feature",
    icon: Footprints,
  },
  {
    date: "5 Martie 2026",
    title: "Pagina Cum functioneaza rescrisa pentru utilizatori",
    description:
      "Pagina a fost complet rescrisa axata pe experienta utilizatorului: ce pasi urmeaza, ce valoare primeste, cum foloseste platforma. Eliminate toate detaliile tehnice (RAG, embeddings, pdf-parse, n8n, tabele DB). Adaugata sectiune Ce mai poti face cu GRANTED si FAQ actualizat.",
    type: "improvement",
    icon: BookOpen,
  },
  {
    date: "5 Martie 2026",
    title: "Note consultant pe rapoarte de eligibilitate",
    description:
      "Camp text pentru note pe fiecare raport de eligibilitate. Endpoint PATCH /api/eligibility-reports/:id/notes. Coloana notes adaugata pe ambele baze de date (DEV si PROD). Permite consultantilor sa adauge observatii personale la analiza AI.",
    type: "feature",
    icon: FileText,
  },
  {
    date: "5 Martie 2026",
    title: "Indecsi de performanta extinsi pe baza de date",
    description:
      "16 indecsi noi pe ambele baze de date: audit_log (4 indecsi), token_usage (2), notifications (1 compus), ghiduri_sections (1 compus), funding_calls (2), eligibility_reports (2), companies (1), active_projects (1), documents (1), usage_quotas (1). Imbunatatesc semnificativ viteza query-urilor admin si de cautare.",
    type: "improvement",
    icon: Database,
  },
  {
    date: "5 Martie 2026",
    title: "Sectiunea Noutati vizibila doar super adminilor",
    description:
      "Link-ul Noutati din sidebar este acum afisat doar utilizatorilor cu rol super_admin. Informatiile tehnice despre implementari raman interne.",
    type: "improvement",
    icon: ShieldAlert,
  },
  {
    date: "4 Martie 2026",
    title: "Editare manuala a apelurilor de finantare din panoul admin",
    description:
      "Administratorii pot acum edita orice apel de finantare direct din tab-ul Apeluri din panoul de administrare. Un buton de editare (creion) deschide un dialog complet cu toate campurile: nume, program, categorie, status, termen limita, finantare maxima, angajati minimi, cifra de afaceri minima, varsta firma, buget UE, URL sursa, necesitate profit, CAEN-uri eligibile, regiuni, tipuri beneficiari, categorii marime, descriere si rezumat AI. Campurile array (CAEN, regiuni, tipuri beneficiari) se separa cu virgula. Modificarile sunt salvate instant si inregistrate in jurnalul de audit.",
    type: "feature",
    icon: Pencil,
  },
  {
    date: "3 Martie 2026",
    title: "Profil AI imbogatit cu toate datele companiei",
    description:
      "Profilul AI al companiei include acum toate campurile disponibile: tip entitate, stare firma, numar Registrul Comertului, data exacta a infiintarii, adresa completa a sediului, structura actionariatului (cu procente) si ultimele 5 evenimente ale firmei. Aceste informatii permit o potrivire semantica mai precisa cu apelurile de finantare si o analiza de eligibilitate mai detaliata.",
    type: "improvement",
    icon: Sparkles,
  },
  {
    date: "3 Martie 2026",
    title: "Detectie raport de eligibilitate existent",
    description:
      "Cand selectezi o companie si un apel pe pagina de eligibilitate, sistemul verifica automat daca exista deja un raport generat anterior. Daca da, apare un card albastru cu verdictul, scorul si data raportului, impreuna cu doua optiuni: 'Vezi raportul existent' (incarca instant datele salvate) sau 'Ruleaza din nou' (re-executa analiza AI). Economiseste tokeni AI si timp prin evitarea verificarilor duplicate.",
    type: "feature",
    icon: CheckCircle2,
  },
  {
    date: "3 Martie 2026",
    title: "Asistent AI contextual pe paginile de apeluri",
    description:
      "Fiecare pagina de detaliu apel include acum un buton 'Intreaba asistentul AI' care deschide un panou de chat. Asistentul raspunde la intrebari despre apelul respectiv (documente necesare, criterii de eligibilitate, buget maxim) folosind sectiunile RAG ingerate din ghidurile oficiale. Raspunsurile sunt afisate in timp real prin streaming. Include 3 intrebari sugerate pentru inceput si pastreaza istoricul conversatiei in sesiune.",
    type: "feature",
    icon: BotMessageSquare,
  },
  {
    date: "3 Martie 2026",
    title: "Notificari in timp real — fara refresh",
    description:
      "Notificarile ajung acum instant prin Server-Sent Events (SSE). Badge-ul din sidebar se actualizeaza automat cand apare o notificare noua, fara a fi nevoie de refresh. Un toast informativ apare in coltul ecranului. Conexiunea SSE se reconecteaza automat in cazul deconectarilor.",
    type: "feature",
    icon: Radio,
  },
  {
    date: "3 Martie 2026",
    title: "Paginare server-side pe catalogul de apeluri",
    description:
      "Catalogul de apeluri de finantare foloseste acum paginare server-side (20 apeluri per pagina) in loc de incarcarea completa. Cautarea si filtrarea dupa status se fac pe server. Controale de navigare (prima/ultima pagina, inainte/inapoi) cu indicator de pagina curenta. Sortarea si filtrele avansate (sursa, documente, indexare RAG) raman client-side pe pagina curenta.",
    type: "improvement",
    icon: ListFilter,
  },
  {
    date: "3 Martie 2026",
    title: "Indecsi de performanta pe bazele de date",
    description:
      "Am adaugat indecsi pe tabelele audit_log (created_at, user_id, action, entity_type), token_usage (created_at, user_id), notifications (user_id + created_at), ghiduri_sections (apel_id + is_active) si funding_calls (status). Query-urile din panoul admin si cautarile vor fi semnificativ mai rapide pe volume mari de date.",
    type: "improvement",
    icon: Database,
  },
  {
    date: "2 Martie 2026",
    title: "Template-uri email editabile din panoul de administrare",
    description:
      "Administratorii pot acum personaliza toate template-urile de email direct din interfata platformei. 6 template-uri disponibile: verificare email, resetare parola, invitatie colaborator, notificare generala, feedback si inregistrare utilizator nou. Editorul include campuri pentru subiect si corp HTML, panou cu variabile disponibile (click pentru inserare), previzualizare live cu date de test in iframe, si buton de resetare la template-ul original. Template-urile sunt stocate in baza de date cu fallback la cele hardcodate. Fiecare template arata un badge Personalizat (verde) sau Original (gri).",
    type: "feature",
    icon: Mail,
  },
  {
    date: "2 Martie 2026",
    title: "Jurnal de audit complet pentru administratori",
    description:
      "Panoul de administrare are acum un tab dedicat Jurnal Audit care inregistreaza toate actiunile importante din platforma: autentificare (login, logout, inregistrare), operatii CRUD (companii, proiecte, documente), actiuni admin (schimbare rol, stergere utilizator, export CSV), si actiuni de sistem (verificare eligibilitate, feedback). Fiecare intrare contine timestamp, email utilizator, actiune, tip entitate, adresa IP si metadate detaliate. Interfata ofera filtre pe actiune si tip entitate, selectie interval de date, paginare configurabila (25/50/100 per pagina), randuri expandabile cu detalii complete (metadata JSON, metoda HTTP, path, user agent), si export CSV.",
    type: "feature",
    icon: ScrollText,
  },
  {
    date: "2 Martie 2026",
    title: "Sistem de preferințe notificări — configurează cum primești alerte",
    description:
      "Fiecare utilizator poate acum controla exact ce notificări primește și pe ce canal (email sau in-app). 8 scenarii configurabile grupate pe categorii: Apeluri (apel nou, deadline, erată), Proiecte (stare proiect, verificare eligibilitate), Documente (document expirat), Sistem (companie nouă, scor AI). Model opt-out: toate notificările sunt active implicit, dezactivezi doar ce nu te interesează. Acces rapid din pagina Notificări → butonul Preferințe. Toate notificările existente (scheduler deadline, document expiry, project init, eligibility check, n8n import) trec acum prin serviciul central notifyUser() care respectă preferințele utilizatorului.",
    type: "feature",
    icon: Bell,
  },
  {
    date: "27 Februarie 2026",
    title: "Parsare PDF reparată — indexarea documentelor funcționează complet",
    description:
      "Librăria pdf-parse a fost actualizată la versiunea 2.x care folosește o API nouă (clasă PDFParse cu metode load/getText). Am adaptat integrarea pentru a funcționa corect cu noua versiune. Documentele PDF ale ghidurilor de finanțare (de pe uefiscdi.gov.ro, mfe.gov.ro etc.) sunt acum descărcate și parsate cu succes, generând secțiuni RAG complete. Anterior, toate PDF-urile eșuau cu eroarea 'pdfParse is not a function'.",
    type: "fix",
    icon: FileText,
  },
  {
    date: "27 Februarie 2026",
    title: "Limita de documente procesate crescută la 15",
    description:
      "Numărul maxim de documente procesate per apel a fost crescut de la 5 la 15. Unele apeluri au peste 50 de documente atașate — cu limita veche de 5, multe ghiduri importante rămâneau neprocesate. Acum se indexează până la 15 documente, suficient pentru a genera profilele ICP (care necesită minim 5 secțiuni RAG).",
    type: "improvement",
    icon: Database,
  },
  {
    date: "27 Februarie 2026",
    title: "Filtru Indexare RAG în catalogul de apeluri",
    description:
      "Catalogul de apeluri are acum un filtru dedicat pentru statusul indexării RAG: Indexate (cel puțin o secțiune), Gata pt. ICP (5+ secțiuni, suficiente pentru generarea profilului ideal), și Neindexate. Fiecare card afișează un badge cu numărul de secțiuni (verde pentru 5+, albastru sub 5). Un card de statistici clickable arată totalul apelurilor indexate și câte sunt gata pentru ICP.",
    type: "feature",
    icon: Database,
  },
  {
    date: "27 Februarie 2026",
    title: "Modul Prospectare & Sales — Profilul Clientului Ideal (ICP)",
    description:
      "Fiecare apel de finanțare are acum un tab 'Prospectare & Sales' care generează automat profilul companiei ideale care ar câștiga apelul. AI-ul analizează criteriile de selecție și punctaj din ghid (nu doar eligibilitatea) și returnează: CAEN-uri ideale, interval cifră de afaceri, angajați optimi, regiuni preferate, vechime minimă, criterii de excludere și tipuri ideale de beneficiari. Include 3 hook-uri de vânzare (formal, direct, urgență) pe care consultantul le poate copia instant. ICP-ul este generat o singură dată și cached global — toți utilizatorii beneficiază. La actualizarea ghidului (erată), profilul este marcat ca 'Outdated' cu buton de regenerare. Export disponibil ca JSON (Copy) sau CSV.",
    type: "feature",
    icon: Target,
  },
  {
    date: "27 Februarie 2026",
    title: "Super Admin: Tab-uri noi — Companii, Apeluri, RAG/Indexare, Activitate, Logs",
    description:
      "Panoul Super Admin are acum 11 tab-uri. Tab-ul Companii afișează toate companiile din platformă cu CUI, CAEN, proprietar și regiune. Tab-ul Apeluri listează toate apelurile de finanțare cu program, deadline, status și posibilitate de ștergere. Tab-ul RAG/Indexare arată câte secțiuni sunt indexate per apel, versiunea curentă și un buton de re-indexare forțată. Tab-ul Activitate afișează grafice săptămânale (utilizatori noi, verificări, consum tokeni) și carduri sumar cu totaluri. Tab-ul Logs centralizează jurnalul de activitate cu evenimente colorate (importuri, consum API).",
    type: "feature",
    icon: ShieldAlert,
  },
  {
    date: "27 Februarie 2026",
    title: "Super Admin: Export CSV și template-uri email",
    description:
      "Din tab-ul Setări poți acum exporta în format CSV: utilizatori, companii, proiecte și consum tokeni. Fișierele includ BOM pentru compatibilitate Excel. Tot în Setări, secțiunea Template-uri email afișează toate tipurile de email-uri trimise de platformă (verificare, resetare parolă, invitații, notificări expirare, notificare admin) cu descrierea trigger-ului și contextul fiecăruia.",
    type: "feature",
    icon: Download,
  },
  {
    date: "27 Februarie 2026",
    title: "Sistem Anti-Erată: versionare ghiduri de finanțare",
    description:
      "Când un ghid de finanțare este re-importat sau actualizat (erată), sistemul păstrează acum istoricul complet. Secțiunile vechi sunt dezactivate automat, iar noile secțiuni sunt indexate cu versiunea actualizată. Căutarea AI folosește exclusiv versiunea cea mai recentă. Dacă un proiect a fost deschis pe o versiune mai veche a ghidului, vei primi o alertă galbenă în spațiul de lucru care te avertizează să re-verifici condițiile de eligibilitate.",
    type: "feature",
    icon: GitBranch,
  },
  {
    date: "27 Februarie 2026",
    title: "Motor de Potrivire Waterfall cu filtre eliminatorii",
    description:
      "Motorul de Potrivire foloseste acum un sistem Waterfall in 3 pasi. Pas 1: filtre eliminatorii (tip beneficiar, CAEN, varsta firma, categorie marime, profit) — daca oricare nu este indeplinit, apelul este marcat ca blocat cu scor 0. Pas 2: scor structural 40% (regiune, angajati, cifra de afaceri cu punctaj proportional). Pas 3: potrivire semantica AI 60%. Cardurile arata acum un cerc de scor vizual, lista de blocaje (rosu) si avertismente (galben), cu detalii expandabile.",
    type: "feature",
    icon: Filter,
  },
  {
    date: "27 Februarie 2026",
    title: "Ingestie On-Demand: PDF-urile se descarcă automat la nevoie",
    description:
      "Când verifici eligibilitatea sau inițiezi un proiect, platforma descarcă și parsează automat ghidurile PDF atașate apelului de n8n. Nu se procesează nimic în avans — doar la cerere, economisind costurile. Dacă PDF-urile nu pot fi descărcate, analiza se face pe baza rezumatului și detaliilor disponibile. Documentele ingerate sunt reutilizate pentru toți utilizatorii care verifică ulterior același apel.",
    type: "feature",
    icon: Download,
  },
  {
    date: "27 Februarie 2026",
    title: "Analiza Expertului — Perspectivă Duală (Optimist + Sceptic)",
    description:
      "Verificarea eligibilității include acum o analiză duală realizată de doi agenți AI: Optimistul identifică punctele forte, oportunitățile și alinierea strategică, în timp ce Scepticul evidențiază riscurile, barierele și potențialele probleme de eligibilitate. Rezultatele sunt afișate în două coloane (verde/roșu) atât pe pagina de eligibilitate cât și în tab-ul Eligibilitate din spațiul de lucru al proiectului.",
    type: "feature",
    icon: Brain,
  },
  {
    date: "27 Februarie 2026",
    title: "Validare CUI si prevenire duplicate",
    description:
      "Campul CUI valideaza acum formatul corect (2-10 cifre, optional prefixat cu RO). Textele invalide sunt respinse inainte de interogarea API-ului. In plus, nu mai poti adauga aceeasi companie de doua ori in contul tau — sistemul detecteaza duplicatele automat.",
    type: "fix",
    icon: ShieldCheck,
  },
  {
    date: "27 Februarie 2026",
    title: "Pagina dedicata pentru fiecare apel de finantare",
    description:
      "Fiecare apel de finantare are acum o pagina dedicata cu toate detaliile: rezumat AI, criterii de eligibilitate (tipuri beneficiari, CAEN-uri, regiuni), sectiuni detaliate din ghid, documente oficiale cu descarcarea lor directa si informatii financiare. Din aceasta pagina poti verifica eligibilitatea companiei tale cu un singur click.",
    type: "feature",
    icon: Landmark,
  },
  {
    date: "27 Februarie 2026",
    title: "Pop-up simplificat in catalogul de finantari",
    description:
      "Modalul de preview din catalogul de apeluri a fost simplificat: arata un rezumat scurt si doua butoane de actiune — 'Vezi detalii complete' (duce la pagina dedicata) si 'Verifica eligibilitatea' (duce direct la analiza AI cu apelul pre-selectat).",
    type: "improvement",
    icon: ArrowLeftRight,
  },
  {
    date: "26 Februarie 2026",
    title: "Managementul consortiilor in proiecte",
    description:
      "Fiecare proiect are acum un tab Consortiu in spatiul de lucru. Poti crea un consortiu, adauga parteneri prin CUI (cu verificare automata termene.ro), asigna roluri (Lider/Partener) si aloca procentul de buget. Liderul este unic — la schimbarea rolului, cel anterior este retrogradat automat. Membrii sunt verificati individual pe criteriile apelului: tip beneficiar, CAEN, regiune, angajati si cifra de afaceri.",
    type: "feature",
    icon: Network,
  },
  {
    date: "26 Februarie 2026",
    title: "Securitate consortiu imbunatatita",
    description:
      "Operatiile pe membri (editare rol/buget, stergere) verifica acum ca membrul apartine consortiului proiectului curent, prevenind manipularea intre proiecte. Validare stricta: rol doar lider/partener, buget 0-100%, un singur lider per consortiu.",
    type: "improvement",
    icon: ShieldBan,
  },
  {
    date: "26 Februarie 2026",
    title: "Tab Documente autoritate in spatiul de lucru",
    description:
      "Proiectele au acum un tab Documente autoritate care afiseaza documentele oficiale ale apelului de finantare grupate pe sectiuni, cu dimensiunea fisierului si link catre sursa originala. Include si rezumatul AI al apelului pentru referinta rapida.",
    type: "feature",
    icon: BookOpen,
  },
  {
    date: "26 Februarie 2026",
    title: "Motor de Potrivire Hibrid cu AI",
    description:
      "Motorul de Potrivire foloseste acum un scor combinat: 40% criterii structurale (CAEN, angajati, cifra de afaceri) + 60% similaritate semantica AI. Hover pe scor pentru a vedea defalcarea detaliata. Apelurile cu rezumat AI generat arata un extras pe card. Scorul semantic compara profilul companiei cu descrierea apelului prin embeddings vectoriale.",
    type: "feature",
    icon: Cpu,
  },
  {
    date: "26 Februarie 2026",
    title: "Profil AI pentru companii",
    description:
      "Fiecare companie poate avea acum un profil AI generat automat din datele existente: CAEN principal si secundare, cifra de afaceri, numar angajati, locatie, evolutie financiara. Profilul este vectorizat pentru potrivire semantica. Buton 'Profil AI' pe Dashboard si 'Actualizeaza profil AI' pe fisa companiei.",
    type: "feature",
    icon: Sparkles,
  },
  {
    date: "26 Februarie 2026",
    title: "Rezumate AI pentru apelurile de finantare",
    description:
      "La importul din n8n, GPT-4o genereaza automat un rezumat structurat in romana pentru fiecare apel: buget, beneficiari eligibili, CAEN-uri, criterii cheie si conditii eliminatorii. Rezumatul apare in modalul de detalii din catalogul de apeluri si pe cardurile de potrivire din Dashboard.",
    type: "feature",
    icon: Brain,
  },
  {
    date: "26 Februarie 2026",
    title: "Extractie automata de campuri la import",
    description:
      "GPT-4o extrage automat din textul ghidurilor: finantare maxima, numar minim angajati, cifra de afaceri minima, CAEN-uri eligibile, categorie si termen limita. Campurile sunt populate automat pe apelul de finantare, eliminand nevoia de completare manuala.",
    type: "improvement",
    icon: Zap,
  },
  {
    date: "26 Februarie 2026",
    title: "Banner de consimtamant cookie-uri (GDPR)",
    description:
      "Platforma afiseaza acum un banner de consimtamant pentru cookie-uri cu 3 categorii: esentiale (obligatorii), functionale (reCAPTCHA) si preferinte (sidebar). Consimtamantul este salvat local si poate fi modificat oricand din setari.",
    type: "feature",
    icon: Cookie,
  },
  {
    date: "26 Februarie 2026",
    title: "Protectie reCAPTCHA pe autentificare",
    description:
      "Google reCAPTCHA v3 protejeaza acum paginile de autentificare (login, inregistrare, resetare parola) impotriva botilor. Verificarea se face transparent, fara captcha vizibil. Functioneaza doar dupa acceptarea cookie-urilor functionale.",
    type: "improvement",
    icon: ShieldEllipsis,
  },
  {
    date: "26 Februarie 2026",
    title: "Calendar cu termene limita si evenimente",
    description:
      "Noua pagina Calendar arata intr-un grid lunar toate termenele limita ale apelurilor de finantare si datele de expirare ale documentelor. Poti naviga intre luni, selecta o zi pentru detalii si vezi o lista completa a evenimentelor lunii curente cu legenda de culori.",
    type: "feature",
    icon: CalendarDays,
  },
  {
    date: "25 Februarie 2026",
    title: "Notificare email la inregistrare utilizator nou",
    description:
      "Administratorul platformei primeste acum un email automat cand un utilizator nou se inregistreaza, cu numele, email-ul si data inregistrarii. Notificarea poate fi activata sau dezactivata din panoul de administrare.",
    type: "feature",
    icon: Mail,
  },
  {
    date: "25 Februarie 2026",
    title: "Tab Setari in panoul de administrare",
    description:
      "Panoul Super Admin are acum un tab dedicat Setari cu toggle-uri pentru configurarea platformei. Primul toggle disponibil: notificare email la inregistrare utilizator nou. Setarile sunt salvate in baza de date si se aplica instant.",
    type: "feature",
    icon: Settings,
  },
  {
    date: "25 Februarie 2026",
    title: "Securitate Supabase imbunatatita",
    description:
      "Row Level Security (RLS) activat pe toate cele 17 tabele cu politici permisive. Functia match_ghiduri are acum search_path fix, iar extensia vector a fost mutata in schema dedicata 'extensions'. Toate avertismentele de securitate din Supabase Security Advisor au fost rezolvate.",
    type: "improvement",
    icon: ShieldCheck,
  },
  {
    date: "25 Februarie 2026",
    title: "Tooltipuri informative pe consumul de tokeni",
    description:
      "In tab-ul Consum tokeni din panoul de administrare, coloanele 'Tokeni intrare', 'Tokeni iesire' si 'Cost estimat' au acum iconite informative cu explicatii detaliate la hover. Cardul explicativ a fost inlocuit pentru o interfata mai curata.",
    type: "improvement",
    icon: Info,
  },
  {
    date: "25 Februarie 2026",
    title: "Filtru Active/Expirate pe catalogul de apeluri",
    description:
      "Catalogul de apeluri de finantare afiseaza acum doar apelurile active by default. Un nou filtru Status (Active / Expirate / Toate) permite comutarea rapida. Contoarele din header arata cate apeluri sunt active si cate au termenul depasit. Badge-ul 'Activ' de pe fiecare card a fost eliminat, iar apelurile expirate apar cu opacitate redusa.",
    type: "feature",
    icon: Filter,
  },
  {
    date: "25 Februarie 2026",
    title: "Filtre si paginare pe pagina de notificari",
    description:
      "Pagina de notificari are acum filtre rapide: dupa status (Toate, Necitite, Citite) si dupa tip (Sistem, Atentionare, Document, Reminder). Lista este paginata cate 20, cu butoane Inapoi/Inainte si contor total. Un badge de tip apare pe fiecare notificare.",
    type: "feature",
    icon: Filter,
  },
  {
    date: "25 Februarie 2026",
    title: "Numar de comentarii pe fiecare document",
    description:
      "Pe butonul de comentarii al fiecarui document din proiect apare acum un badge cu numarul total de comentarii. Badge-ul se actualizeaza automat cand adaugi sau stergi un comentariu.",
    type: "improvement",
    icon: MessageSquare,
  },
  {
    date: "25 Februarie 2026",
    title: "Pagina de feedback trimite si pagina curenta",
    description:
      "Cand trimiti un feedback din widget, email-ul de notificare include acum si pagina pe care te aflai (ex: Dashboard, Proiecte, Setari). Util pentru contextul in care a aparut problema sau sugestia.",
    type: "improvement",
    icon: MessageCircle,
  },
  {
    date: "25 Februarie 2026",
    title: "Imagine de profil pentru utilizatori",
    description:
      "Fiecare utilizator isi poate incarca o imagine de profil din pagina Setari cont. Imaginea apare in sidebar, pe pagina de setari si langa comentariile la documente, pentru o identificare rapida a membrilor echipei.",
    type: "feature",
    icon: Camera,
  },
  {
    date: "25 Februarie 2026",
    title: "Comentarii imbunatatite cu avatar si nume",
    description:
      "Comentariile la documente arata acum avatarul (imagine sau initiale), numele complet al autorului si data/ora exacta. Interfata este mai clara si mai profesionala pentru colaborare in echipa.",
    type: "improvement",
    icon: MessageCircle,
  },
  {
    date: "25 Februarie 2026",
    title: "Schimbare parola din setari",
    description:
      "Utilizatorii pot schimba parola direct din pagina Setari cont. Formularul cere parola curenta si noua parola (minim 8 caractere) cu confirmare si butoane de vizibilitate.",
    type: "feature",
    icon: Lock,
  },
  {
    date: "25 Februarie 2026",
    title: "Resetare parola uitata",
    description:
      "Flux complet de resetare a parolei: de pe pagina de autentificare, apasa 'Ai uitat parola?', introdu email-ul si primesti un link de resetare valid 1 ora. Pagina dedicata pentru setarea parolei noi.",
    type: "feature",
    icon: KeyRound,
  },
  {
    date: "25 Februarie 2026",
    title: "Roluri de utilizator: Super Admin, Consultant, Utilizator",
    description:
      "Platforma are acum 3 tipuri de rol: Super Admin, Consultant si Utilizator. Rolul este afisat in sidebar (colorat diferit) si in panoul de administrare. Super Admin-ul poate schimba rolul oricarui utilizator din tab-ul Utilizatori.",
    type: "feature",
    icon: UserCog,
  },
  {
    date: "25 Februarie 2026",
    title: "Deconectare completa",
    description:
      "La deconectare, sesiunea este distrusa pe server, cookie-urile sunt sterse, cache-ul React Query si cache-urile browser-ului sunt curatate. Nu mai ramai autentificat accidental dupa logout.",
    type: "fix",
    icon: LogOut,
  },
  {
    date: "25 Februarie 2026",
    title: "Email-uri prin domeniu verificat Resend",
    description:
      "Toate email-urile platformei (verificare cont, resetare parola, invitatii, notificari) sunt trimise acum de la noreply@ervian.ro prin contul Resend cu domeniu verificat, garantand livrarea catre orice adresa de email.",
    type: "improvement",
    icon: Mail,
  },
  {
    date: "25 Februarie 2026",
    title: "Panou Super Admin cu monitorizare completa",
    description:
      "Panoul de administrare include 5 tab-uri: Utilizatori (cu roluri, export GDPR, stergere), Importuri n8n, Feedback, Consum tokeni (OpenAI si termene.ro separate) si documentatie. Accesibil doar pentru Super Admin.",
    type: "feature",
    icon: ShieldAlert,
  },
  {
    date: "25 Februarie 2026",
    title: "Motor de Potrivire imbunatatit cu CAEN secundare si date financiare",
    description:
      "Algoritmul de potrivire a fost complet rescris. Acum verifica CAEN-ul principal si toate CAEN-urile secundare ale companiei, compara cifra de afaceri si numarul de angajati cu cerintele fiecarui apel, analizeaza profitabilitatea si existenta datelor financiare detaliate. Scorul este calculat procentual pe baza criteriilor indeplinite, iar apelurile sub pragul de 30% sunt filtrate automat.",
    type: "improvement",
    icon: TrendingUp,
  },
  {
    date: "25 Februarie 2026",
    title: "Verificare eligibilitate AI din Dashboard",
    description:
      "Fiecare card de apel din Motorul de Potrivire include acum un buton 'Verifica eligibilitate' care te duce direct la analiza RAG cu compania si apelul pre-selectate. Fluxul complet: scor rapid (matching algoritmic) -> verificare AI (RAG cu ghidul PDF) -> initiaza proiect.",
    type: "feature",
    icon: ShieldCheck,
  },
  {
    date: "25 Februarie 2026",
    title: "Criterii vizuale pe cardurile de potrivire",
    description:
      "Fiecare apel arata acum badge-uri colorate pentru fiecare criteriu verificat: CAEN principal/secundar, numar angajati, cifra de afaceri, profitabilitate, date financiare. Cu tooltip pe fiecare badge pentru a vedea punctajul acordat.",
    type: "improvement",
    icon: Filter,
  },
  {
    date: "25 Februarie 2026",
    title: "Import automat cu indexare RAG din n8n",
    description:
      "Apelurile importate din n8n sunt acum indexate automat pentru analiza AI. Textul din ghiduri (details_sections) si documentele asociate sunt vectorizate la import, fara a mai fi nevoie de upload manual. La actualizare (erata/corrigendum), sectiunile vechi sunt sterse si re-indexate automat.",
    type: "feature",
    icon: Zap,
  },
  {
    date: "25 Februarie 2026",
    title: "Apeluri din catalog disponibile in eligibilitate",
    description:
      "Dropdown-ul de selectie a apelurilor din pagina Eligibilitate combina acum ambele surse: apelurile create manual si cele din catalogul de finantare importate prin n8n. Apelurile din catalog pot fi indexate automat cu un singur click.",
    type: "feature",
    icon: ArrowLeftRight,
  },
  {
    date: "25 Februarie 2026",
    title: "Suport documente Word (DOC/DOCX)",
    description:
      "Pe langa PDF-uri, acum poti incarca si documente Word (.doc, .docx) pentru analiza de eligibilitate. Textul este extras automat cu mammoth si procesat identic ca la PDF-uri.",
    type: "feature",
    icon: FileText,
  },
  {
    date: "25 Februarie 2026",
    title: "Re-indexare automata la actualizari",
    description:
      "Cand un apel este actualizat prin n8n (erata, corrigendum, modificari), sectiunile vechi din baza de vectori sunt sterse automat si inlocuite cu cele noi. Apelurile identice nu sunt re-indexate, economisind tokeni OpenAI.",
    type: "improvement",
    icon: RefreshCw,
  },
  {
    date: "25 Februarie 2026",
    title: "Verificare eligibilitate cu AI (RAG)",
    description:
      "Sistemul RAG (Retrieval Augmented Generation) analizeaza eligibilitatea companiei tale pentru un apel de finantare. Ghidul este vectorizat, sectiunile relevante sunt gasite prin cautare semantica, iar GPT-4o genereaza un verdict cu scor, criterii si recomandari.",
    type: "feature",
    icon: Brain,
  },
  {
    date: "25 Februarie 2026",
    title: "Import flexibil din n8n",
    description:
      "Endpoint-ul de import accepta acum diverse formate de campuri (titlu/title/name/denumire, id/external_id/cod, etc.) si payload-uri de pana la 50MB. Logging detaliat pentru depanare.",
    type: "improvement",
    icon: Download,
  },
  {
    date: "24 Februarie 2026",
    title: "Catalog apeluri de finantare",
    description:
      "Pagina dedicata cu toate apelurile de finantare disponibile. Poti cauta, filtra pe categorie sau sursa, si vedea detalii complete pentru fiecare apel — inclusiv buget, termen limita, documente asociate si link catre pagina oficiala.",
    type: "feature",
    icon: Landmark,
  },
  {
    date: "24 Februarie 2026",
    title: "Pagina Companiile mele",
    description:
      "Toate companiile tale sunt acum centralizate intr-o pagina dedicata. Poti adauga companii noi prin CUI, vedea detaliile fiecareia, sau naviga rapid spre fisa completa a companiei.",
    type: "feature",
    icon: Building2,
  },
  {
    date: "24 Februarie 2026",
    title: "Fisa detaliata a companiei — 4 module de date",
    description:
      "Fiecare companie are acum o fisa completa cu 4 sectiuni: Identificare (date generale, adresa, CAEN), Financiar (cifra de afaceri, profit, angajati), Actionariat (structura asociatilor) si Evenimente (istoricul modificarilor la Registrul Comertului).",
    type: "feature",
    icon: Layers,
  },
  {
    date: "24 Februarie 2026",
    title: "Verificare companie prin termene.ro",
    description:
      "Verificarea companiilor se face acum prin API-ul oficial termene.ro. Introduci CUI-ul si datele firmei sunt preluate automat din surse oficiale (RECOM, Ministerul Finantelor).",
    type: "feature",
    icon: Search,
  },
  {
    date: "24 Februarie 2026",
    title: "Calendar cu termene limita",
    description:
      "Calendarul iti arata toate termenele importante: deadline-uri pentru apeluri de finantare si expirari de documente. Navigheaza intre luni si click pe o zi pentru a vedea evenimentele.",
    type: "feature",
    icon: CalendarDays,
  },
  {
    date: "24 Februarie 2026",
    title: "Colaborare in echipa",
    description:
      "Poti invita colegi in proiectele tale cu roluri de Vizualizator sau Editor. Gestioneaza echipa din tab-ul Echipa al fiecarui proiect, cu invitatii prin email.",
    type: "feature",
    icon: Users,
  },
  {
    date: "24 Februarie 2026",
    title: "Comentarii pe documente",
    description:
      "Adauga observatii si comentarii pe fiecare document din spatiul de lucru. Ideal pentru coordonare cu colegii si pentru a lasa note importante.",
    type: "feature",
    icon: MessageSquare,
  },
  {
    date: "24 Februarie 2026",
    title: "Istoric versiuni documente",
    description:
      "Fiecare re-incarcare de document creeaza o versiune noua. Poti vedea istoricul complet al versiunilor din meniul contextual al documentului.",
    type: "feature",
    icon: History,
  },
  {
    date: "24 Februarie 2026",
    title: "Flux de status pentru proiecte",
    description:
      "Proiectele au acum un flux vizual: Initiat -> Pregatire documente -> Verificare interna -> Depus -> Evaluare -> Aprobat/Respins. Schimba statusul cu o nota si vezi istoricul complet.",
    type: "feature",
    icon: GitBranch,
  },
  {
    date: "24 Februarie 2026",
    title: "Statistici dashboard imbunatatite",
    description:
      "Dashboard-ul afiseaza acum statistici detaliate: companii, proiecte active, documente incarcate vs. lipsa, progres mediu si termenele apropiate cu numaratoare inversa.",
    type: "improvement",
    icon: BarChart3,
  },
  {
    date: "24 Februarie 2026",
    title: "Filtrare apeluri de finantare",
    description:
      "Motorul de Potrivire include acum filtre: cauta dupa nume, filtreaza pe categorie (IT & Digital, Energie, Agricultura, Cercetare, Industrie) si gaseste rapid apelurile potrivite.",
    type: "improvement",
    icon: Filter,
  },
  {
    date: "24 Februarie 2026",
    title: "Notificari automate prin email",
    description:
      "Primesti automat notificari in platforma si pe email cand un document expira in 7 zile sau un termen de finantare se apropie in 14 zile.",
    type: "feature",
    icon: Bell,
  },
  {
    date: "24 Februarie 2026",
    title: "Lansare platforma GRANTED",
    description:
      "Platforma GRANTED este acum disponibila! Poti sa iti creezi cont, sa verifici compania dupa CUI si sa descoperi programele de finantare europene potrivite pentru afacerea ta.",
    type: "feature",
    icon: Sparkles,
  },
  {
    date: "24 Februarie 2026",
    title: "Motor de Potrivire Fonduri",
    description:
      "Motorul de Potrivire analizeaza profilul companiei tale si iti recomanda cele mai relevante programe de finantare europene, cu scor de compatibilitate.",
    type: "feature",
    icon: Globe,
  },
  {
    date: "24 Februarie 2026",
    title: "Spatiu de Lucru pentru Proiecte",
    description:
      "Fiecare proiect are acum un spatiu dedicat unde poti urmari lista de documente necesare, progresul de completare si stadiul general al dosarului de finantare.",
    type: "feature",
    icon: Database,
  },
  {
    date: "24 Februarie 2026",
    title: "Incarcare reala de documente",
    description:
      "Poti incarca fisiere reale (PDF, DOC, DOCX, XLS, XLSX, PNG, JPG) in spatiul de lucru al proiectului. Fisierele sunt salvate pe server si pot fi descarcate oricand.",
    type: "feature",
    icon: FileUp,
  },
  {
    date: "24 Februarie 2026",
    title: "Editare, previzualizare si stergere documente",
    description:
      "Documentele incarcate pot fi redenumite, inlocuite cu o versiune noua, previzualizate (PDF-uri si imagini) sau descarcate pe calculator. Fiecare document are un meniu cu optiuni rapide.",
    type: "improvement",
    icon: Pencil,
  },
  {
    date: "24 Februarie 2026",
    title: "Autentificare securizata cu email",
    description:
      "Contul tau este protejat prin autentificare cu email si parola. Primesti un link de verificare pe email la inregistrare pentru a-ti confirma adresa.",
    type: "improvement",
    icon: Mail,
  },
  {
    date: "24 Februarie 2026",
    title: "Conformitate GDPR",
    description:
      "Platforma respecta regulamentul GDPR. La prima autentificare, ti se solicita acceptul politicii de confidentialitate inainte de a accesa functionalitatile.",
    type: "improvement",
    icon: Shield,
  },
];

const typeBadge: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  feature: { label: "Functionalitate noua", variant: "default" },
  improvement: { label: "Imbunatatire", variant: "secondary" },
  fix: { label: "Corectie", variant: "outline" },
};

export default function NewsPage() {
  const { data: adminCheck, isLoading } = useQuery<{ isSuperAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 w-full flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!adminCheck?.isSuperAdmin) {
    return (
      <div className="p-4 sm:p-6 w-full text-center space-y-4 min-h-[400px] flex flex-col items-center justify-center">
        <Shield className="w-12 h-12 text-muted-foreground/40" />
        <h1 className="text-xl font-semibold" data-testid="text-news-restricted">Acces restricționat</h1>
        <p className="text-sm text-muted-foreground">Această pagină este disponibilă doar pentru administratori.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Newspaper className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-news-title">Noutati</h1>
          <p className="text-sm text-muted-foreground">
            Ultimele actualizari si imbunatatiri ale platformei
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {updates.map((update, index) => {
          const badge = typeBadge[update.type];
          return (
            <Card key={index} data-testid={`card-news-${index}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <update.icon className="w-4 h-4 text-primary" />
                    </div>
                    <CardTitle className="text-base">{update.title}</CardTitle>
                  </div>
                  <Badge variant={badge.variant} className="shrink-0 text-xs">
                    {badge.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{update.description}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{update.date}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
