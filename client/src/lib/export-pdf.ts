function sanitize(text: string): string {
  return text
    .replace(/ă/g, "a").replace(/Ă/g, "A")
    .replace(/â/g, "a").replace(/Â/g, "A")
    .replace(/î/g, "i").replace(/Î/g, "I")
    .replace(/ș/g, "s").replace(/Ș/g, "S").replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ț/g, "t").replace(/Ț/g, "T").replace(/ţ/g, "t").replace(/Ţ/g, "T")
    .replace(/„/g, "\"").replace(/"/g, "\"").replace(/"/g, "\"")
    .replace(/–/g, "-").replace(/—/g, "-")
    .replace(/…/g, "...");
}

interface DualAgentPoint {
  title: string;
  detail: string;
  section?: string;
}

export interface PDFEligibilityData {
  verdict: string;
  score: number;
  summary: string;
  criteria: Array<{ criteriu: string; status: string; detalii: string }>;
  recommendations: string[];
  dualAnalysis?: {
    hasDualAnalysis: boolean;
    optimist: { points: DualAgentPoint[]; summary: string };
    skeptic: { points: DualAgentPoint[]; summary: string };
  };
  notes?: string;
}

export interface PDFCompanyData {
  name: string;
  cui: string;
  caen?: string | null;
  employees?: number | null;
  revenue?: number | null;
}

export interface PDFApelData {
  titlu: string;
  program?: string | null;
  deadline?: string | null;
}

export async function exportEligibilityPDF(
  result: PDFEligibilityData,
  companyData: PDFCompanyData | undefined,
  apelData: PDFApelData | undefined,
  reportDate?: string,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 20;
  const mR = 20;
  const mBottom = 20;
  const cW = pageW - mL - mR;
  let y = 0;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > pageH - mBottom) {
      doc.addPage();
      y = 20;
    }
  };

  const writeLines = (text: string, x: number, maxW: number, fontSize: number, lineH: number) => {
    doc.setFontSize(fontSize);
    const lines: string[] = doc.splitTextToSize(sanitize(text), maxW);
    for (const line of lines) {
      newPageIfNeeded(lineH);
      doc.text(line, x, y);
      y += lineH;
    }
  };

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("GRANTED", mL, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Raport de Verificare a Eligibilitatii", mL, 25);
  doc.setFontSize(8);
  const dateStr = reportDate
    ? new Date(reportDate).toLocaleDateString("ro-RO") + "  " + new Date(reportDate).toLocaleTimeString("ro-RO")
    : new Date().toLocaleDateString("ro-RO") + "  " + new Date().toLocaleTimeString("ro-RO");
  doc.text(sanitize(dateStr), pageW - mR, 25, { align: "right" });
  y = 46;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Informatii generale", mL, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (companyData) {
    const info = [
      `Companie: ${companyData.name}`,
      `CUI: ${companyData.cui}`,
      companyData.caen ? `CAEN principal: ${companyData.caen}` : null,
      companyData.employees ? `Numar angajati: ${companyData.employees}` : null,
      companyData.revenue ? `Cifra de afaceri: ${Number(companyData.revenue).toLocaleString("ro-RO")} RON` : null,
    ].filter(Boolean) as string[];
    for (const line of info) {
      doc.text(sanitize(line), mL, y);
      y += 5.5;
    }
  }
  if (apelData) {
    y += 2;
    writeLines(`Apel: ${apelData.titlu}`, mL, cW, 10, 5.5);
    if (apelData.program) { doc.text(sanitize(`Program: ${apelData.program}`), mL, y); y += 5.5; }
    if (apelData.deadline) { doc.text(sanitize(`Termen limita: ${new Date(apelData.deadline).toLocaleDateString("ro-RO")}`), mL, y); y += 5.5; }
  }
  y += 6;

  const verdictColors: Record<string, [number, number, number]> = {
    "ELIGIBIL": [22, 163, 74],
    "NEELIGIBIL": [220, 38, 38],
    "PARTIAL ELIGIBIL": [202, 138, 4],
    "DATE INSUFICIENTE": [107, 114, 128],
  };
  const verdictUpper = sanitize(result.verdict).toUpperCase();
  const vc = verdictColors[verdictUpper] || verdictColors["DATE INSUFICIENTE"];

  newPageIfNeeded(24);
  doc.setFillColor(vc[0], vc[1], vc[2]);
  doc.roundedRect(mL, y, cW, 18, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize(result.verdict).toUpperCase(), mL + 6, y + 11);
  doc.setFontSize(11);
  doc.text(`Scor: ${result.score}/100`, pageW - mR - 6, y + 11, { align: "right" });
  y += 26;

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  if (result.summary) {
    writeLines(result.summary, mL, cW, 10, 5);
    y += 6;
  }

  if (result.criteria.length > 0) {
    newPageIfNeeded(12);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(sanitize(`Criterii analizate (${result.criteria.length})`), mL, y);
    y += 8;

    for (const c of result.criteria) {
      const statusLower = (c.status || "").toLowerCase();
      const isMet = statusLower.includes("ndeplinit") && !statusLower.includes("ne");
      const isUnmet = statusLower.includes("ne");
      const color: [number, number, number] = isMet ? [22, 163, 74] : isUnmet ? [220, 38, 38] : [180, 130, 0];
      const symbol = isMet ? "[OK]" : isUnmet ? "[X]" : "[?]";

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const detailLines: string[] = doc.splitTextToSize(sanitize(c.detalii || ""), cW - 20);
      const contentH = 5 + 3 + detailLines.length * 4.5;
      const blockH = contentH + 6;
      newPageIfNeeded(blockH + 3);

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(mL, y, cW, blockH, 1.5, 1.5, "F");

      const rowY = y + 4.5;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(symbol, mL + 4, rowY);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      const criteriumLines: string[] = doc.splitTextToSize(sanitize(c.criteriu || ""), cW - 55);
      doc.text(criteriumLines[0] || "", mL + 16, rowY);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(sanitize(`[${c.status}]`), pageW - mR - 4, rowY, { align: "right" });

      doc.setTextColor(70, 70, 70);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      let dy = rowY + 7;
      for (const dl of detailLines) {
        doc.text(dl, mL + 16, dy);
        dy += 4.5;
      }
      y += blockH + 3;
    }
    y += 4;
  }

  if (result.dualAnalysis && result.dualAnalysis.hasDualAnalysis) {
    newPageIfNeeded(20);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Analiza Expertului (Perspectiva Duala)", mL, y);
    y += 10;

    const renderAgentSection = (
      agent: { points: DualAgentPoint[]; summary: string },
      label: string,
      headerColor: [number, number, number],
      accentColor: [number, number, number],
      bgColor: [number, number, number],
    ) => {
      newPageIfNeeded(16);
      doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.roundedRect(mL, y, cW, 9, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(sanitize(label), mL + 5, y + 6.2);
      y += 14;

      if (agent.summary) {
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "italic");
        const sumLines: string[] = doc.splitTextToSize(sanitize(agent.summary), cW - 12);
        for (const sl of sumLines) {
          newPageIfNeeded(4.5);
          doc.text(sl, mL + 5, y);
          y += 4.5;
        }
        y += 5;
      }

      for (const p of agent.points) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        const titleLines: string[] = doc.splitTextToSize(sanitize(p.title), cW - 22);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        const detailLines: string[] = doc.splitTextToSize(sanitize(p.detail), cW - 22);
        const refLine = p.section ? 1 : 0;
        const contentH = titleLines.length * 5 + 2 + detailLines.length * 4.2 + (refLine ? 4.5 : 0);
        const blockH = contentH + 6;
        newPageIfNeeded(blockH + 3);

        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.roundedRect(mL + 3, y, cW - 6, blockH, 1.5, 1.5, "F");

        const innerTop = y + 3.5;

        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("\u2022", mL + 6, innerTop + 1);

        doc.setTextColor(30, 30, 30);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        let py = innerTop;
        for (const tl of titleLines) {
          doc.text(tl, mL + 14, py);
          py += 5;
        }
        py += 2;

        doc.setTextColor(70, 70, 70);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        for (const dl of detailLines) {
          doc.text(dl, mL + 14, py);
          py += 4.2;
        }

        if (p.section) {
          py += 1;
          doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
          doc.setFontSize(7);
          doc.setFont("helvetica", "italic");
          doc.text(sanitize(`Ref: ${p.section}`), mL + 14, py);
        }

        y += blockH + 4;
      }

      if (agent.points.length === 0) {
        doc.setTextColor(140, 140, 140);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "italic");
        doc.text("Nu au fost identificate puncte specifice.", mL + 5, y);
        y += 7;
      }
      y += 6;
    };

    renderAgentSection(
      result.dualAnalysis.optimist,
      "Puncte Forte & Oportunitati (Optimist)",
      [22, 163, 74],
      [22, 163, 74],
      [240, 253, 244],
    );

    renderAgentSection(
      result.dualAnalysis.skeptic,
      "Riscuri & Bariere de Eligibilitate (Sceptic)",
      [220, 38, 38],
      [220, 38, 38],
      [254, 242, 242],
    );
  }

  if (result.recommendations.length > 0) {
    newPageIfNeeded(12);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Recomandari", mL, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    for (const r of result.recommendations) {
      const rLines: string[] = doc.splitTextToSize(sanitize(r), cW - 10);
      newPageIfNeeded(rLines.length * 4.5 + 3);
      doc.setTextColor(37, 99, 235);
      doc.text("-", mL + 2, y);
      doc.setTextColor(50, 50, 50);
      let ry = y;
      for (const rl of rLines) {
        doc.text(rl, mL + 8, ry);
        ry += 4.5;
      }
      y = ry + 1.5;
    }
    y += 3;
  }

  if (result.notes) {
    newPageIfNeeded(16);
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Note consultant", mL, y);
    y += 8;
    writeLines(result.notes, mL, cW, 9, 4.5);
    y += 4;
  }

  newPageIfNeeded(12);
  doc.setDrawColor(210, 210, 210);
  doc.line(mL, y, pageW - mR, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text("Important: Analiza de eligibilitate generata de AI are caracter informativ si orientativ.", mL, y);
  y += 3.5;
  doc.text("Nu constituie consultanta juridica sau financiara. Decizia finala de aplicare apartine consultantului", mL, y);
  y += 3.5;
  doc.text("si clientului, pe baza propriei due diligence. GRANTED nu raspunde pentru decizii luate exclusiv pe baza acestor analize.", mL, y);

  const slug = companyData ? companyData.name.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30) : "raport";
  doc.save(`Eligibilitate_${slug}_${new Date().toISOString().split("T")[0]}.pdf`);
}

export interface ICPMatchEntry {
  companyName: string;
  cui: string;
  caen?: string | null;
  judet?: string | null;
  employees?: number | null;
  revenue?: number | null;
  score: number;
  level: string;
  eligibility?: "eligible" | "blocked";
  blockers?: Array<{ type: string; detail: string }>;
  missingData: number;
  criteria: Array<{ name: string; met: boolean; detail: string }>;
}

export async function exportIcpMatchPDF(
  matches: ICPMatchEntry[],
  apelData: PDFApelData | undefined,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const mL = 20;
  const mR = 20;
  const mBottom = 20;
  const cW = pageW - mL - mR;
  let y = 0;

  const newPageIfNeeded = (needed: number) => {
    if (y + needed > pageH - mBottom) {
      doc.addPage();
      y = 20;
    }
  };

  const writeLines = (text: string, x: number, maxW: number, fontSize: number, lineH: number) => {
    doc.setFontSize(fontSize);
    const lines: string[] = doc.splitTextToSize(sanitize(text), maxW);
    for (const line of lines) {
      newPageIfNeeded(lineH);
      doc.text(line, x, y);
      y += lineH;
    }
  };

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("GRANTED", mL, 16);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Raport ICP Match — Companiile Mele vs. Profil Ideal", mL, 25);
  doc.setFontSize(8);
  const dateStr = new Date().toLocaleDateString("ro-RO") + "  " + new Date().toLocaleTimeString("ro-RO");
  doc.text(sanitize(dateStr), pageW - mR, 25, { align: "right" });
  y = 46;

  if (apelData) {
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Apel de finantare", mL, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    writeLines(apelData.titlu, mL, cW, 10, 5.5);
    if (apelData.program) { doc.text(sanitize(`Program: ${apelData.program}`), mL, y); y += 5.5; }
    if (apelData.deadline) { doc.text(sanitize(`Termen limita: ${new Date(apelData.deadline).toLocaleDateString("ro-RO")}`), mL, y); y += 5.5; }
    y += 6;
  }

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize(`Rezultate potrivire (${matches.length} companii)`), mL, y);
  y += 10;

  for (let mi = 0; mi < matches.length; mi++) {
    const m = matches[mi];
    const isBlocked = m.eligibility === "blocked";
    const levelLabel = isBlocked
      ? "NEELIGIBIL"
      : m.level === "excelent" ? "Potrivire excelenta" : m.level === "partial" ? "Potrivire partiala" : "Potrivire slaba";
    const headerColor: [number, number, number] = isBlocked
      ? [153, 27, 27]
      : m.level === "excelent" ? [22, 163, 74] : m.level === "partial" ? [202, 138, 4] : [220, 38, 38];

    newPageIfNeeded(30);

    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.roundedRect(mL, y, cW, 14, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(sanitize(`${mi + 1}. ${m.companyName}`), mL + 5, y + 6);
    doc.setFontSize(10);
    doc.text(`${m.score}%`, pageW - mR - 5, y + 6, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(sanitize(levelLabel), pageW - mR - 5, y + 11, { align: "right" });
    y += 18;

    if (isBlocked && m.blockers && m.blockers.length > 0) {
      doc.setFillColor(254, 226, 226);
      const blockerLines: string[] = [];
      for (const b of m.blockers) blockerLines.push(...doc.splitTextToSize(sanitize(`• ${b.detail}`), cW - 12));
      const blockH = 6 + blockerLines.length * 4 + 3;
      newPageIfNeeded(blockH + 2);
      doc.roundedRect(mL + 2, y, cW - 4, blockH, 1.5, 1.5, "F");
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Conditii eliminatorii nerespectate:", mL + 5, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      let by = y + 9.5;
      for (const line of blockerLines) { doc.text(line, mL + 5, by); by += 4; }
      y += blockH + 3;
    }

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const companyInfo = [
      `CUI: ${m.cui}`,
      m.caen ? `CAEN: ${m.caen}` : null,
      m.judet ? `Judet: ${m.judet}` : null,
      m.employees != null ? `Angajati: ${m.employees}` : null,
      m.revenue != null ? `Cifra afaceri: ${Number(m.revenue).toLocaleString("ro-RO")} RON` : null,
    ].filter(Boolean).join("  |  ");
    doc.text(sanitize(companyInfo), mL + 2, y);
    y += 7;

    for (const c of m.criteria) {
      const isMissing = sanitize(c.detail).startsWith("Date lipsa");
      const symbol = c.met ? "[OK]" : isMissing ? "[?]" : "[X]";
      const color: [number, number, number] = c.met ? [22, 163, 74] : isMissing ? [180, 130, 0] : [220, 38, 38];

      doc.setFontSize(8.5);
      const detailLines: string[] = doc.splitTextToSize(sanitize(c.detail), cW - 40);
      const blockH = 5 + detailLines.length * 4 + 3;
      newPageIfNeeded(blockH + 2);

      doc.setFillColor(248, 248, 248);
      doc.roundedRect(mL + 2, y, cW - 4, blockH, 1.5, 1.5, "F");

      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(symbol, mL + 5, y + 5);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(9);
      doc.text(sanitize(c.name), mL + 18, y + 5);

      doc.setTextColor(70, 70, 70);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      let dy = y + 5;
      for (const dl of detailLines) {
        doc.text(dl, mL + 45, dy);
        dy += 4;
      }
      y += blockH + 2;
    }

    if (m.missingData > 0) {
      newPageIfNeeded(8);
      doc.setTextColor(180, 130, 0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(sanitize(`Atentie: ${m.missingData} criterii cu date lipsa — completeaza profilul companiei pentru un scor mai precis.`), mL + 2, y);
      y += 6;
    }

    y += 8;
  }

  newPageIfNeeded(12);
  doc.setDrawColor(210, 210, 210);
  doc.line(mL, y, pageW - mR, y);
  y += 5;
  doc.setFontSize(7.5);
  doc.setTextColor(160, 160, 160);
  doc.text("Important: Analiza ICP Match are caracter informativ si orientativ.", mL, y);
  y += 3.5;
  doc.text("Nu constituie consultanta juridica sau financiara. Profilul clientului ideal este generat de AI", mL, y);
  y += 3.5;
  doc.text("pe baza ghidului de finantare si poate contine inexactitati. GRANTED nu raspunde pentru decizii luate exclusiv pe baza acestor analize.", mL, y);

  const slug = apelData ? apelData.titlu.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30) : "ICP_Match";
  doc.save(`ICP_Match_${slug}_${new Date().toISOString().split("T")[0]}.pdf`);
}
