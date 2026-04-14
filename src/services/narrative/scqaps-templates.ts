/**
 * Template-uri SCQAPS (Situaţie · Complicaţie · Întrebare · Răspuns · Plan · Suport)
 * pentru cele 12 pagini cockpit. Variabilele {{var}} sunt înlocuite din datele
 * paginii (vezi NarrativeService).
 *
 * Ton: business, conversaţional, vocea antreprenorului — NU jargon de consultant.
 */

export interface SCQAPSTemplate {
  situatie:    string
  complicatie: string
  intrebare:   string
  raspuns:     string
  plan:        string
  suport:      string
}

const GENERIC: SCQAPSTemplate = {
  situatie:    'Secţiunea „{{titlu}}" — datele sunt în curs de validare împreună cu echipa ta.',
  complicatie: 'Încă nu am suficientă informaţie ca să trag o concluzie fermă pe această secţiune.',
  intrebare:   'Care sunt informaţiile pe care le mai aştepţi să le colectezi pentru această secţiune?',
  raspuns:     'Vom completa împreună această secţiune în următorul workshop.',
  plan:        'Ne aliniem la datele lipsă în următoarele zile şi revenim cu varianta finală.',
  suport:      'Sunt aici să te ajut să completezi datele şi să interpretezi rezultatele.',
}

export const TEMPLATES: Record<number, SCQAPSTemplate> = {
  // ── Pag. 1 — Client Overview ──────────────────────────────────────────────
  1: {
    situatie:
      '{{company_name}} este o companie din industria {{industry}}, cu {{employee_count}} angajaţi şi o cifră de afaceri de {{annual_revenue}} RON. Persoana de contact principal este {{contact_name}}, în rolul de {{contact_role}}.',
    complicatie:
      'La acest profil — {{company_size_label}} cu {{annual_revenue}} RON cifră de afaceri — orice decizie de transformare digitală are impact direct vizibil în P&L în primele 12 luni. Nu ai marja unui corporate să greşeşti pe pilot.',
    intrebare:
      'Care este obiectivul tău de business pe următorii 24 de luni şi cum vrei ca tehnologia să accelereze acel obiectiv?',
    raspuns:
      'Construim împreună o radiografie obiectivă a unde stai astăzi şi care sunt cele 2-3 pârghii cu cel mai mare impact pe EBIT.',
    plan:
      'Pornim cu evaluarea EBIT baseline (pag. 2) şi scorul de maturitate ACDA (pag. 3). Cele două dau direcţia pentru tot restul cockpit-ului.',
    suport:
      'Eu, ca partener strategic, garantez că deciziile au fundament în date, nu în trenduri. Tu rămâi proprietarul deciziilor.',
  },

  // ── Pag. 2 — EBIT Baseline ────────────────────────────────────────────────
  2: {
    situatie:
      '{{company_name}} are astăzi un EBIT de {{ebit_current}} RON, cu o marjă de {{ebit_margin}}% pe o cifră de afaceri de {{annual_revenue}} RON.',
    complicatie:
      'Targetul propus este {{ebit_target}} RON ({{delta_pct}}% peste actual), un delta de {{delta_ron}} RON. Fără pârghii operaţionale clare, acest delta rămâne aspiraţie. Bugetul tău IT actual este {{it_spend}} RON — fiecare leu trebuie să aibă un return măsurabil.',
    intrebare:
      'Pe ce 2-3 procese poţi muta acul EBIT-ului în 12 luni, fără să-ţi destabilizezi operaţiunea curentă?',
    raspuns:
      'Targetul de {{delta_ron}} RON este realist dacă atacăm procesele identificate la Value Stream (pag. 4) şi oportunităţile prioritare (pag. 7-8).',
    plan:
      'Construim un model financiar pe iniţiative cu ROI > 15% şi payback < 18 luni. Pilotăm rapid, scalăm doar ce funcţionează.',
    suport:
      'Modelul investiţional rămâne al tău şi se actualizează lunar pe baza datelor reale, nu a presupunerilor.',
  },

  // ── Pag. 3 — Maturitate ACDA ──────────────────────────────────────────────
  3: {
    situatie:
      '{{company_name}} are un scor global de maturitate digitală de {{scor_total}}/5, nivel {{nivel}}. Pe arii: Oameni & Adopţie {{scor_oameni}}, Tehnologie & Date {{scor_tehnologie}}, Strategie & ROI {{scor_strategie}}.',
    complicatie:
      '{{count_sub_prag}} din 9 indicatori se află sub pragul minim de 3.0 — semn că problema nu e doar tehnică, ci şi de cultură şi de focus strategic. Indicatorii critici: {{sub_prag_list}}.',
    intrebare:
      'Care e adevărul pe care nu vrei să-l auzi despre felul în care echipa ta foloseşte tehnologia astăzi?',
    raspuns:
      'Scorul {{scor_total}}/5 nu e o etichetă. Este punctul de pornire pentru un plan de 12-24 luni care urcă scorul cu cel puţin un nivel — verificabil, măsurabil.',
    plan:
      'Atacăm primii 3 indicatori sub prag cu intervenţii specifice. Aria cu pondere mare şi scor mic primeşte prioritate (Strategie & ROI ponderează 40%).',
    suport:
      'Reevaluăm scorul trimestrial. Vei vedea negru pe alb cum se mişcă acul, nu doar promisiuni.',
  },

  // ── Pag. 4 — Value Stream Analysis ────────────────────────────────────────
  4: {
    situatie:
      'Am identificat procesele cheie din operaţiunea {{company_name}} şi am pus pe hârtie timp execuţie, cost şi grad de blocare.',
    complicatie:
      'Procesele cu grad de blocare 4-5 frânează creşterea cifrei de afaceri şi consumă cash care ar trebui să intre în EBIT.',
    intrebare:
      'Care sunt cele 2 procese a căror simplificare ar elibera cel mai mult timp de management în următoarele 6 luni?',
    raspuns:
      'Procesele identificate sunt candidate pentru automatizare sau redesign. Impactul cumulat depăşeşte {{impact_procese_label}}.',
    plan:
      'Selectăm 1-2 procese pentru pilot rapid (4-8 săptămâni). Doar ce funcţionează intră în roadmap-ul mare.',
    suport:
      'Lucrăm cot la cot cu owner-ii proceselor, nu peste capul lor. Adopţia se câştigă, nu se decretează.',
  },

  // ── Pag. 5 — Problem Framing ──────────────────────────────────────────────
  5: {
    situatie:
      'Am extras din conversaţie {{count_probleme}} probleme structurale care afectează {{company_name}} astăzi.',
    complicatie:
      'Impactul financiar cumulat estimat este de {{impact_total}} RON anual. Cele mai grele: {{top_probleme}}.',
    intrebare:
      'Pe care din aceste probleme ai pierdut deja somn în ultimele 90 de zile?',
    raspuns:
      'Problemele identificate nu sunt evenimente izolate, ci simptome ale aceloraşi cauze rădăcină — pe care le abordăm sistemic, nu punctual.',
    plan:
      'Mapăm fiecare problemă pe un indicator de maturitate (pag. 3) şi pe o oportunitate de transformare (pag. 7). Nimic nu rămâne orfan.',
    suport:
      'Soluţiile vor fi proporţionale cu impactul. Nu vinem cu artilerie grea pentru probleme mici.',
  },

  // ── Pag. 6 — Technology Landscape ─────────────────────────────────────────
  6: {
    situatie:
      'Stack-ul tehnologic actual al {{company_name}} este în curs de inventariere — sisteme principale, dependenţe cloud/on-prem, integrări critice.',
    complicatie:
      'Fără o hartă clară a tehnologiei, orice plan de transformare riscă să dubleze investiţii sau să spargă integrări care funcţionează.',
    intrebare:
      'Care sunt sistemele pe care nu îţi permiţi să le opreşti nici 4 ore?',
    raspuns:
      'Identificăm sistemele critice şi le tratăm cu grijă specială în roadmap. Restul pot evolua mai agresiv.',
    plan:
      'Construim arhitectura target ca o evoluţie din cea curentă, nu ca o demolare-reconstrucţie.',
    suport:
      'Recomandările tehnologice sunt vendor-agnostic. Tu rămâi liber să alegi parteneri pe baza criteriilor tale.',
  },

  // ── Pag. 7 — Opportunity Map ──────────────────────────────────────────────
  7: {
    situatie:
      'Am cartografiat {{count_oportunitati}} oportunităţi de transformare digitală relevante pentru {{company_name}}, cu impact EBIT estimat cumulat de {{impact_total}} RON anual.',
    complicatie:
      'Nu poţi ataca toate simultan fără să-ţi pierzi focusul. Top oportunitate: {{top_oportunitate}}.',
    intrebare:
      'Dacă ai putea livra doar 2 din aceste oportunităţi în următoarele 12 luni, care ar fi şi de ce?',
    raspuns:
      'Prioritizarea (pag. 8) sortează oportunităţile după impact / efort / risc. Decizia finală e a ta — eu îţi pun pe masă datele.',
    plan:
      'Începem cu 1-2 oportunităţi cu efort S/M şi risc ≤ 3. Pilotul validează ipotezele înainte să scalăm.',
    suport:
      'ROI-ul fiecărei oportunităţi se monitorizează lună de lună. Ce nu merge se opreşte rapid.',
  },

  // ── Pag. 8-10: Generic stub în Faza 1 ─────────────────────────────────────
  8:  { ...GENERIC },
  9:  { ...GENERIC },
  10: { ...GENERIC },
}

export function templateForPage(pageNum: number): SCQAPSTemplate {
  return TEMPLATES[pageNum] ?? GENERIC
}
