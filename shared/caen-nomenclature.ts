/**
 * CAEN Rev.2 nomenclature — curated subset of the most commonly encountered
 * 4-digit codes used by Romanian businesses (~250 entries).
 *
 * Used by the catalog autocomplete endpoint and as a label lookup on the UI.
 * Not exhaustive: users may type any 4-digit code (custom additions allowed).
 */

export interface CaenEntry {
  code: string;
  label: string;
}

export const CAEN_NOMENCLATURE: CaenEntry[] = [
  // A. Agricultură, silvicultură și pescuit
  { code: "0111", label: "Cultivarea cerealelor (exclusiv orez), plantelor leguminoase și a plantelor producătoare de semințe oleaginoase" },
  { code: "0113", label: "Cultivarea legumelor și a pepenilor, a rădăcinoaselor și tuberculilor" },
  { code: "0119", label: "Cultivarea altor plante din culturi nepermanente" },
  { code: "0121", label: "Cultivarea strugurilor" },
  { code: "0124", label: "Cultivarea fructelor semințoase și sâmburoase" },
  { code: "0125", label: "Cultivarea fructelor arbuștilor fructiferi, căpșunilor, nuciferelor și a altor pomi fructiferi" },
  { code: "0128", label: "Cultivarea condimentelor, plantelor aromatice, medicinale și a plantelor de uz farmaceutic" },
  { code: "0130", label: "Cultivarea plantelor pentru înmulțire" },
  { code: "0141", label: "Creșterea bovinelor de lapte" },
  { code: "0142", label: "Creșterea altor bovine" },
  { code: "0145", label: "Creșterea ovinelor și caprinelor" },
  { code: "0146", label: "Creșterea porcinelor" },
  { code: "0147", label: "Creșterea păsărilor" },
  { code: "0149", label: "Creșterea altor animale" },
  { code: "0150", label: "Activități în ferme mixte (cultură vegetală combinată cu creșterea animalelor)" },
  { code: "0161", label: "Activități auxiliare pentru producția vegetală" },
  { code: "0162", label: "Activități auxiliare pentru creșterea animalelor" },
  { code: "0163", label: "Activități după recoltare" },
  { code: "0164", label: "Pregătirea semințelor" },
  { code: "0210", label: "Silvicultură și alte activități forestiere" },
  { code: "0220", label: "Exploatarea forestieră" },
  { code: "0240", label: "Activități de servicii anexe silviculturii" },
  { code: "0311", label: "Pescuitul maritim" },
  { code: "0312", label: "Pescuitul în ape dulci" },
  { code: "0321", label: "Acvacultura maritimă" },
  { code: "0322", label: "Acvacultura în ape dulci" },

  // C. Industria prelucrătoare — alimente & băuturi
  { code: "1011", label: "Prelucrarea și conservarea cărnii" },
  { code: "1012", label: "Prelucrarea și conservarea cărnii de pasăre" },
  { code: "1013", label: "Fabricarea produselor din carne (inclusiv din carne de pasăre)" },
  { code: "1020", label: "Prelucrarea și conservarea peștelui, crustaceelor și moluștelor" },
  { code: "1031", label: "Prelucrarea și conservarea cartofilor" },
  { code: "1032", label: "Fabricarea sucurilor de fructe și legume" },
  { code: "1039", label: "Prelucrarea și conservarea fructelor și legumelor n.c.a." },
  { code: "1041", label: "Fabricarea uleiurilor și grăsimilor" },
  { code: "1051", label: "Fabricarea produselor lactate și a brânzeturilor" },
  { code: "1061", label: "Fabricarea produselor de morărit" },
  { code: "1071", label: "Fabricarea pâinii; fabricarea prăjiturilor și a produselor proaspete de patiserie" },
  { code: "1072", label: "Fabricarea biscuiților și pișcoturilor; fabricarea prăjiturilor și a produselor conservate de patiserie" },
  { code: "1073", label: "Fabricarea macaroanelor, tăițeilor, cuș-cuș-ului și a altor produse făinoase similare" },
  { code: "1081", label: "Fabricarea zahărului" },
  { code: "1082", label: "Fabricarea produselor din cacao, a ciocolatei și a produselor zaharoase" },
  { code: "1085", label: "Fabricarea de mâncăruri preparate" },
  { code: "1086", label: "Fabricarea preparatelor alimentare omogenizate și alimentelor dietetice" },
  { code: "1089", label: "Fabricarea altor produse alimentare n.c.a." },
  { code: "1091", label: "Fabricarea preparatelor pentru hrana animalelor de fermă" },
  { code: "1092", label: "Fabricarea preparatelor pentru hrana animalelor de companie" },
  { code: "1101", label: "Distilarea, rafinarea și mixarea băuturilor alcoolice" },
  { code: "1102", label: "Fabricarea vinurilor din struguri" },
  { code: "1105", label: "Fabricarea berii" },
  { code: "1107", label: "Producția de băuturi răcoritoare nealcoolice; producția de ape minerale și alte ape îmbuteliate" },

  // C. Industria prelucrătoare — textile & îmbrăcăminte
  { code: "1310", label: "Pregătirea fibrelor și filarea fibrelor textile" },
  { code: "1320", label: "Producția de țesături" },
  { code: "1330", label: "Finisarea materialelor textile" },
  { code: "1392", label: "Fabricarea de articole confecționate din textile (cu excepția îmbrăcămintei și lenjeriei de corp)" },
  { code: "1394", label: "Fabricarea de odgoane, frânghii, sfori și plase" },
  { code: "1395", label: "Fabricarea de textile nețesute și articole din acestea, cu excepția confecțiilor de îmbrăcăminte" },
  { code: "1399", label: "Fabricarea altor articole textile n.c.a." },
  { code: "1411", label: "Fabricarea articolelor de îmbrăcăminte din piele" },
  { code: "1412", label: "Fabricarea articolelor de îmbrăcăminte pentru lucru" },
  { code: "1413", label: "Fabricarea altor articole de îmbrăcăminte (exclusiv lenjeria de corp)" },
  { code: "1414", label: "Fabricarea de articole de lenjerie de corp" },
  { code: "1419", label: "Fabricarea altor articole de îmbrăcăminte și accesorii n.c.a." },
  { code: "1420", label: "Fabricarea articolelor din blană" },
  { code: "1431", label: "Fabricarea prin tricotare sau croșetare a ciorapilor și articolelor de galanterie" },
  { code: "1439", label: "Fabricarea prin tricotare sau croșetare a altor articole de îmbrăcăminte" },
  { code: "1511", label: "Tăbăcirea și finisarea pieilor; prepararea și vopsirea blănurilor" },
  { code: "1512", label: "Fabricarea articolelor de voiaj și marochinărie și a articolelor de harnașament" },
  { code: "1520", label: "Fabricarea încălțămintei" },

  // C. Lemn, hârtie, tipărire
  { code: "1610", label: "Tăierea și rindeluirea lemnului" },
  { code: "1621", label: "Fabricarea de furnire și a panourilor de lemn" },
  { code: "1622", label: "Fabricarea parchetului asamblat în panouri" },
  { code: "1623", label: "Fabricarea altor elemente de dulgherie și tâmplărie pentru construcții" },
  { code: "1624", label: "Fabricarea ambalajelor din lemn" },
  { code: "1629", label: "Fabricarea altor produse din lemn; fabricarea articolelor din plută, paie și din alte materiale vegetale împletite" },
  { code: "1711", label: "Fabricarea celulozei" },
  { code: "1712", label: "Fabricarea hârtiei și cartonului" },
  { code: "1721", label: "Fabricarea hârtiei și cartonului ondulat și a ambalajelor din hârtie și carton" },
  { code: "1722", label: "Fabricarea produselor de uz gospodăresc și sanitar din hârtie sau carton" },
  { code: "1723", label: "Fabricarea articolelor de papetărie" },
  { code: "1729", label: "Fabricarea altor articole din hârtie și carton n.c.a." },
  { code: "1812", label: "Alte activități de tipărire n.c.a." },
  { code: "1813", label: "Servicii pregătitoare pentru pretipărire" },
  { code: "1814", label: "Legătorie și servicii conexe" },

  // C. Chimie, plastic, sticlă, metal
  { code: "2011", label: "Fabricarea gazelor industriale" },
  { code: "2014", label: "Fabricarea altor produse chimice organice de bază" },
  { code: "2015", label: "Fabricarea îngrășămintelor și produselor azotoase" },
  { code: "2016", label: "Fabricarea materialelor plastice în forme primare" },
  { code: "2030", label: "Fabricarea vopselelor, lacurilor, cernelii tipografice și masticurilor" },
  { code: "2041", label: "Fabricarea săpunurilor, detergenților și a produselor de întreținere" },
  { code: "2042", label: "Fabricarea parfumurilor și a produselor cosmetice (de toaletă)" },
  { code: "2110", label: "Fabricarea produselor farmaceutice de bază" },
  { code: "2120", label: "Fabricarea preparatelor farmaceutice" },
  { code: "2211", label: "Fabricarea anvelopelor și a camerelor de aer; reșaparea și refacerea anvelopelor" },
  { code: "2219", label: "Fabricarea altor produse din cauciuc" },
  { code: "2221", label: "Fabricarea plăcilor, foliilor, tuburilor și profilelor din material plastic" },
  { code: "2222", label: "Fabricarea articolelor de ambalaj din material plastic" },
  { code: "2223", label: "Fabricarea articolelor din material plastic pentru construcții" },
  { code: "2229", label: "Fabricarea altor produse din material plastic" },
  { code: "2311", label: "Fabricarea sticlei plate" },
  { code: "2313", label: "Fabricarea articolelor din sticlă" },
  { code: "2331", label: "Fabricarea plăcilor și dalelor din ceramică" },
  { code: "2351", label: "Fabricarea cimentului" },
  { code: "2352", label: "Fabricarea varului și ipsosului" },
  { code: "2361", label: "Fabricarea produselor din beton pentru construcții" },
  { code: "2369", label: "Fabricarea altor articole din beton, ciment și ipsos" },
  { code: "2370", label: "Tăierea, fasonarea și finisarea pietrei" },
  { code: "2410", label: "Producția de metale feroase sub forme primare și de feroaliaje" },
  { code: "2420", label: "Producția de tuburi, țevi, profile tubulare și accesorii pentru acestea, din oțel" },
  { code: "2511", label: "Fabricarea de construcții metalice și părți componente ale structurilor metalice" },
  { code: "2512", label: "Fabricarea de uși și ferestre din metal" },
  { code: "2521", label: "Producția de radiatoare și cazane pentru încălzire centrală" },
  { code: "2530", label: "Producția generatoarelor de aburi (cu excepția cazanelor pentru încălzire centrală)" },
  { code: "2550", label: "Fabricarea produselor metalice obținute prin deformare plastică; metalurgia pulberilor" },
  { code: "2561", label: "Tratarea și acoperirea metalelor" },
  { code: "2562", label: "Operațiuni de mecanică generală" },
  { code: "2571", label: "Fabricarea produselor de tăiat" },
  { code: "2572", label: "Fabricarea articolelor de feronerie" },
  { code: "2599", label: "Fabricarea altor articole din metal n.c.a." },

  // C. Electronice, electrice, mașini, vehicule
  { code: "2611", label: "Fabricarea subansamblurilor electronice (module)" },
  { code: "2612", label: "Fabricarea altor componente electronice" },
  { code: "2620", label: "Fabricarea calculatoarelor și a echipamentelor periferice" },
  { code: "2630", label: "Fabricarea echipamentelor de comunicații" },
  { code: "2640", label: "Fabricarea produselor electronice de larg consum" },
  { code: "2651", label: "Fabricarea de instrumente și dispozitive pentru măsură, verificare, control, navigație" },
  { code: "2660", label: "Fabricarea de echipamente pentru radiologie, electrodiagnostic și electroterapie" },
  { code: "2670", label: "Fabricarea de instrumente optice și echipamente fotografice" },
  { code: "2711", label: "Fabricarea motoarelor, generatoarelor și transformatoarelor electrice" },
  { code: "2712", label: "Fabricarea aparatelor de distribuție și control a electricității" },
  { code: "2731", label: "Fabricarea de cabluri cu fibră optică" },
  { code: "2732", label: "Fabricarea altor fire și cabluri electrice și electronice" },
  { code: "2733", label: "Fabricarea dispozitivelor de conexiune pentru fire și cabluri electrice și electronice" },
  { code: "2740", label: "Fabricarea de echipamente electrice de iluminat" },
  { code: "2751", label: "Fabricarea de aparate electrocasnice" },
  { code: "2811", label: "Fabricarea de motoare și turbine (cu excepția celor pentru avioane, autovehicule și motociclete)" },
  { code: "2812", label: "Fabricarea de motoare hidraulice" },
  { code: "2814", label: "Fabricarea de robinete și valve" },
  { code: "2822", label: "Fabricarea echipamentelor de ridicat și manipulat" },
  { code: "2825", label: "Fabricarea echipamentelor de ventilație și frigorifice, exclusiv pentru gospodării casnice" },
  { code: "2829", label: "Fabricarea altor mașini și utilaje de utilizare generală n.c.a." },
  { code: "2830", label: "Fabricarea mașinilor și utilajelor pentru agricultură și exploatări forestiere" },
  { code: "2841", label: "Fabricarea utilajelor pentru prelucrarea metalului" },
  { code: "2910", label: "Fabricarea autovehiculelor de transport rutier" },
  { code: "2920", label: "Producția de caroserii pentru autovehicule; fabricarea de remorci și semiremorci" },
  { code: "2932", label: "Fabricarea altor piese și accesorii pentru autovehicule și pentru motoare de autovehicule" },
  { code: "3092", label: "Fabricarea de biciclete și de vehicule pentru invalizi" },
  { code: "3101", label: "Fabricarea de mobilă pentru birouri și magazine" },
  { code: "3102", label: "Fabricarea de mobilă pentru bucătării" },
  { code: "3109", label: "Fabricarea de mobilă n.c.a." },
  { code: "3211", label: "Baterea monedelor" },
  { code: "3212", label: "Fabricarea bijuteriilor și articolelor similare din metale și pietre prețioase" },
  { code: "3220", label: "Fabricarea instrumentelor muzicale" },
  { code: "3230", label: "Fabricarea articolelor pentru sport" },
  { code: "3240", label: "Fabricarea jocurilor și jucăriilor" },
  { code: "3250", label: "Fabricarea de dispozitive, aparate și instrumente medicale și stomatologice" },
  { code: "3299", label: "Fabricarea altor produse manufacturiere n.c.a." },

  // D-E. Energie, apă, deșeuri
  { code: "3511", label: "Producția de energie electrică" },
  { code: "3512", label: "Transportul energiei electrice" },
  { code: "3513", label: "Distribuția energiei electrice" },
  { code: "3514", label: "Comercializarea energiei electrice" },
  { code: "3530", label: "Furnizarea de abur și aer condiționat" },
  { code: "3600", label: "Captarea, tratarea și distribuția apei" },
  { code: "3700", label: "Colectarea și epurarea apelor uzate" },
  { code: "3811", label: "Colectarea deșeurilor nepericuloase" },
  { code: "3821", label: "Tratarea și eliminarea deșeurilor nepericuloase" },
  { code: "3831", label: "Demontarea (dezasamblarea) mașinilor și a echipamentelor scoase din uz pentru recuperarea materialelor" },
  { code: "3832", label: "Recuperarea materialelor reciclabile sortate" },

  // F. Construcții
  { code: "4110", label: "Dezvoltare (promovare) imobiliară" },
  { code: "4120", label: "Lucrări de construcții a clădirilor rezidențiale și nerezidențiale" },
  { code: "4211", label: "Lucrări de construcții a drumurilor și autostrăzilor" },
  { code: "4221", label: "Lucrări de construcții a proiectelor utilitare pentru fluide" },
  { code: "4222", label: "Lucrări de construcții a proiectelor utilitare pentru electricitate și telecomunicații" },
  { code: "4291", label: "Construcții hidrotehnice" },
  { code: "4299", label: "Lucrări de construcții a altor proiecte inginerești n.c.a." },
  { code: "4311", label: "Lucrări de demolare a construcțiilor" },
  { code: "4312", label: "Lucrări de pregătire a terenului" },
  { code: "4313", label: "Lucrări de foraj și sondaj pentru construcții" },
  { code: "4321", label: "Lucrări de instalații electrice" },
  { code: "4322", label: "Lucrări de instalații sanitare, de încălzire și de aer condiționat" },
  { code: "4329", label: "Alte lucrări de instalații pentru construcții" },
  { code: "4331", label: "Lucrări de ipsoserie" },
  { code: "4332", label: "Lucrări de tâmplărie și dulgherie" },
  { code: "4333", label: "Lucrări de pardosire și placare a pereților" },
  { code: "4334", label: "Lucrări de vopsitorie, zugrăveli și montări de geamuri" },
  { code: "4339", label: "Alte lucrări de finisare" },
  { code: "4391", label: "Lucrări de învelitori, șarpante și terase la construcții" },
  { code: "4399", label: "Alte lucrări speciale de construcții n.c.a." },

  // G. Comerț
  { code: "4511", label: "Comerț cu autoturisme și autovehicule ușoare (sub 3,5 tone)" },
  { code: "4520", label: "Întreținerea și repararea autovehiculelor" },
  { code: "4531", label: "Comerț cu ridicata de piese și accesorii pentru autovehicule" },
  { code: "4671", label: "Comerț cu ridicata al combustibililor solizi, lichizi și gazoși și al produselor derivate" },
  { code: "4690", label: "Comerț cu ridicata nespecializat" },
  { code: "4711", label: "Comerț cu amănuntul în magazine nespecializate, cu vânzare predominantă de produse alimentare, băuturi și tutun" },
  { code: "4719", label: "Comerț cu amănuntul în magazine nespecializate, cu vânzare predominantă de produse nealimentare" },
  { code: "4729", label: "Comerț cu amănuntul al altor produse alimentare, în magazine specializate" },
  { code: "4751", label: "Comerț cu amănuntul al textilelor, în magazine specializate" },
  { code: "4771", label: "Comerț cu amănuntul al îmbrăcămintei, în magazine specializate" },
  { code: "4791", label: "Comerț cu amănuntul prin intermediul caselor de comenzi sau prin Internet" },

  // H. Transport și depozitare
  { code: "4910", label: "Transporturi interurbane de călători pe calea ferată" },
  { code: "4920", label: "Transporturi de marfă pe calea ferată" },
  { code: "4931", label: "Transporturi urbane, suburbane și metropolitane de călători" },
  { code: "4932", label: "Transporturi cu taxiuri" },
  { code: "4939", label: "Alte transporturi terestre de călători n.c.a." },
  { code: "4941", label: "Transporturi rutiere de mărfuri" },
  { code: "4942", label: "Servicii de mutare" },
  { code: "5210", label: "Depozitări" },
  { code: "5221", label: "Activități de servicii anexe pentru transporturi terestre" },
  { code: "5224", label: "Manipulări" },
  { code: "5229", label: "Alte activități anexe transporturilor" },
  { code: "5310", label: "Activități poștale desfășurate sub obligativitatea serviciului universal" },
  { code: "5320", label: "Alte activități poștale și de curier" },

  // I. Hoteluri și restaurante
  { code: "5510", label: "Hoteluri și alte facilități de cazare similare" },
  { code: "5520", label: "Facilități de cazare pentru vacanțe și perioade de scurtă durată" },
  { code: "5530", label: "Parcuri pentru rulote, campinguri și tabere" },
  { code: "5590", label: "Alte servicii de cazare" },
  { code: "5610", label: "Restaurante" },
  { code: "5621", label: "Activități de alimentație (catering) pentru evenimente" },
  { code: "5629", label: "Alte servicii de alimentație n.c.a." },
  { code: "5630", label: "Baruri și alte activități de servire a băuturilor" },

  // J. Informații și comunicații
  { code: "5811", label: "Activități de editare a cărților" },
  { code: "5814", label: "Activități de editare a revistelor și periodicelor" },
  { code: "5821", label: "Activități de editare a jocurilor de calculator" },
  { code: "5829", label: "Activități de editare a altor produse software" },
  { code: "5911", label: "Activități de producție cinematografică, video și de programe de televiziune" },
  { code: "5912", label: "Activități de post-producție cinematografică, video și de programe de televiziune" },
  { code: "5920", label: "Activități de realizare a înregistrărilor audio și activități de editare muzicală" },
  { code: "6010", label: "Activități de difuzare a programelor de radio" },
  { code: "6020", label: "Activități de difuzare a programelor de televiziune" },
  { code: "6110", label: "Activități de telecomunicații prin rețele cu cablu" },
  { code: "6120", label: "Activități de telecomunicații prin rețele fără cablu (exclusiv prin satelit)" },
  { code: "6201", label: "Activități de realizare a softului la comandă (software orientat client)" },
  { code: "6202", label: "Activități de consultanță în tehnologia informației" },
  { code: "6203", label: "Activități de management (gestiune și exploatare) a mijloacelor de calcul" },
  { code: "6209", label: "Alte activități de servicii privind tehnologia informației" },
  { code: "6311", label: "Prelucrarea datelor, administrarea paginilor web și activități conexe" },
  { code: "6312", label: "Activități ale portalurilor web" },
  { code: "6391", label: "Activități ale agențiilor de știri" },
  { code: "6399", label: "Alte activități de servicii informaționale n.c.a." },

  // K. Intermedieri financiare și asigurări
  { code: "6419", label: "Alte activități de intermedieri monetare" },
  { code: "6492", label: "Alte activități de creditare" },
  { code: "6499", label: "Alte intermedieri financiare n.c.a." },
  { code: "6511", label: "Activități de asigurări de viață" },
  { code: "6512", label: "Alte activități de asigurări (exceptând asigurările de viață)" },

  // L. Tranzacții imobiliare
  { code: "6810", label: "Cumpărarea și vânzarea de bunuri imobiliare proprii" },
  { code: "6820", label: "Închirierea și subînchirierea bunurilor imobiliare proprii sau închiriate" },
  { code: "6831", label: "Agenții imobiliare" },
  { code: "6832", label: "Administrarea imobilelor pe bază de comision sau contract" },

  // M. Activități profesionale, științifice și tehnice
  { code: "6910", label: "Activități juridice" },
  { code: "6920", label: "Activități de contabilitate și audit financiar; consultanță în domeniul fiscal" },
  { code: "7010", label: "Activități ale direcțiilor (centralelor), birourilor administrative centralizate" },
  { code: "7021", label: "Activități de consultanță în domeniul relațiilor publice și al comunicării" },
  { code: "7022", label: "Activități de consultanță pentru afaceri și management" },
  { code: "7111", label: "Activități de arhitectură" },
  { code: "7112", label: "Activități de inginerie și consultanță tehnică legate de acestea" },
  { code: "7120", label: "Activități de testări și analize tehnice" },
  { code: "7211", label: "Cercetare-dezvoltare în biotehnologie" },
  { code: "7219", label: "Cercetare-dezvoltare în alte științe naturale și inginerie" },
  { code: "7220", label: "Cercetare-dezvoltare în științe sociale și umaniste" },
  { code: "7311", label: "Activități ale agențiilor de publicitate" },
  { code: "7312", label: "Servicii de reprezentare media" },
  { code: "7320", label: "Activități de studiere a pieței și de sondare a opiniei publice" },
  { code: "7410", label: "Activități de design specializat" },
  { code: "7420", label: "Activități fotografice" },
  { code: "7430", label: "Activități de traducere scrisă și orală (interpreți)" },
  { code: "7490", label: "Alte activități profesionale, științifice și tehnice n.c.a." },
  { code: "7500", label: "Activități veterinare" },

  // N. Activități de servicii administrative și activități de servicii suport
  { code: "7711", label: "Activități de închiriere și leasing cu autoturisme și autovehicule rutiere ușoare" },
  { code: "7721", label: "Activități de închiriere și leasing cu bunuri recreaționale și echipament sportiv" },
  { code: "7733", label: "Activități de închiriere și leasing cu mașini și echipamente de birou (inclusiv calculatoare)" },
  { code: "7734", label: "Activități de închiriere și leasing cu echipamente de transport pe apă" },
  { code: "7740", label: "Leasing cu bunuri intangibile (exclusiv financiare)" },
  { code: "7810", label: "Activități ale agențiilor de plasare a forței de muncă" },
  { code: "7820", label: "Activități de contractare, pe baze temporare, a personalului" },
  { code: "7830", label: "Servicii de furnizare și management a forței de muncă" },
  { code: "7911", label: "Activități ale agențiilor turistice" },
  { code: "7912", label: "Activități ale tur-operatorilor" },
  { code: "7990", label: "Alte servicii de rezervare și asistență turistică" },
  { code: "8010", label: "Activități de protecție și gardă" },
  { code: "8121", label: "Activități generale de curățenie a clădirilor" },
  { code: "8122", label: "Activități specializate de curățenie a clădirilor, mijloacelor de transport, mașini și utilaje industriale" },
  { code: "8129", label: "Alte activități de curățenie n.c.a." },
  { code: "8130", label: "Activități de întreținere peisagistică" },
  { code: "8211", label: "Activități combinate de secretariat" },
  { code: "8219", label: "Activități de fotocopiere, de pregătire a documentelor și alte activități specializate de secretariat" },
  { code: "8220", label: "Activități ale centrelor de intermediere telefonică (call center)" },
  { code: "8230", label: "Activități de organizare a expozițiilor, târgurilor și congreselor" },
  { code: "8291", label: "Activități ale agențiilor de colectare și a birourilor (oficiilor) de raportare a creditului" },
  { code: "8292", label: "Activități de ambalare" },
  { code: "8299", label: "Alte activități de servicii suport pentru întreprinderi n.c.a." },

  // P. Învățământ
  { code: "8510", label: "Învățământ preșcolar" },
  { code: "8520", label: "Învățământ primar" },
  { code: "8531", label: "Învățământ secundar general" },
  { code: "8532", label: "Învățământ secundar, tehnic sau profesional" },
  { code: "8541", label: "Învățământ superior non-universitar" },
  { code: "8542", label: "Învățământ superior universitar" },
  { code: "8551", label: "Învățământ în domeniul sportiv și recreațional" },
  { code: "8552", label: "Învățământ în domeniul cultural (limbi străine, muzică, teatru, dans, arte plastice etc.)" },
  { code: "8553", label: "Școli de conducere (pilotaj)" },
  { code: "8559", label: "Alte forme de învățământ n.c.a." },
  { code: "8560", label: "Activități de servicii suport pentru învățământ" },

  // Q. Sănătate și asistență socială
  { code: "8610", label: "Activități de asistență spitalicească" },
  { code: "8621", label: "Activități de asistență medicală generală" },
  { code: "8622", label: "Activități de asistență medicală specializată" },
  { code: "8623", label: "Activități de asistență stomatologică" },
  { code: "8690", label: "Alte activități referitoare la sănătatea umană" },
  { code: "8710", label: "Activități ale centrelor de îngrijire medicală" },
  { code: "8720", label: "Activități ale centrelor de recuperare psihică și de dezintoxicare, exclusiv spitale" },
  { code: "8730", label: "Activități ale căminelor de bătrâni și ale căminelor pentru persoane aflate în incapacitate de a se îngriji singure" },
  { code: "8810", label: "Activități de asistență socială, fără cazare, pentru bătrâni și pentru persoane aflate în incapacitate de a se îngriji singure" },
  { code: "8891", label: "Activități de îngrijire zilnică pentru copii" },
  { code: "8899", label: "Alte activități de asistență socială, fără cazare, n.c.a." },

  // R. Activități de spectacole, culturale și recreative
  { code: "9001", label: "Activități de interpretare artistică (spectacole)" },
  { code: "9002", label: "Activități suport pentru interpretarea artistică (spectacole)" },
  { code: "9003", label: "Activități de creație artistică" },
  { code: "9004", label: "Activități de gestionare a sălilor de spectacole" },
  { code: "9101", label: "Activități ale bibliotecilor și arhivelor" },
  { code: "9102", label: "Activități ale muzeelor" },
  { code: "9103", label: "Gestionarea monumentelor, clădirilor istorice și a altor obiective turistice similare" },
  { code: "9104", label: "Activități ale grădinilor zoologice, botanice și ale rezervațiilor naturale" },
  { code: "9311", label: "Activități ale bazelor sportive" },
  { code: "9312", label: "Activități ale cluburilor sportive" },
  { code: "9313", label: "Activități ale centrelor de fitness" },
  { code: "9319", label: "Alte activități sportive" },
  { code: "9321", label: "Bâlciuri și parcuri de distracții" },
  { code: "9329", label: "Alte activități recreative și distractive n.c.a." },

  // S. Alte activități de servicii
  { code: "9511", label: "Repararea calculatoarelor și a echipamentelor periferice" },
  { code: "9512", label: "Repararea echipamentelor de comunicații" },
  { code: "9521", label: "Repararea aparatelor electronice de uz casnic" },
  { code: "9522", label: "Repararea dispozitivelor de uz gospodăresc și a echipamentelor pentru casă și grădină" },
  { code: "9523", label: "Repararea încălțămintei și a articolelor din piele" },
  { code: "9601", label: "Spălarea și curățarea (uscată) articolelor textile și a produselor din blană" },
  { code: "9602", label: "Coafură și alte activități de înfrumusețare" },
  { code: "9603", label: "Activități de pompe funebre și similare" },
  { code: "9604", label: "Activități de întreținere corporală" },
  { code: "9609", label: "Alte activități de servicii n.c.a." },
];

export const CAEN_BY_CODE: Map<string, CaenEntry> = new Map(
  CAEN_NOMENCLATURE.map((e) => [e.code, e]),
);

export function getCaenLabel(code: string): string {
  return CAEN_BY_CODE.get(code)?.label ?? "";
}

/**
 * Search the CAEN nomenclature by query (matches against code and label).
 * Returns up to `limit` entries, prefix matches first.
 */
export function searchCaen(query: string, limit = 10): CaenEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const prefix: CaenEntry[] = [];
  const contains: CaenEntry[] = [];
  for (const entry of CAEN_NOMENCLATURE) {
    const code = entry.code.toLowerCase();
    const label = entry.label.toLowerCase();
    if (code.startsWith(q) || label.startsWith(q)) {
      prefix.push(entry);
    } else if (code.includes(q) || label.includes(q)) {
      contains.push(entry);
    }
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...contains].slice(0, limit);
}
