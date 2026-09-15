"use client";

import { FormulaNote } from "@/context/SessionContext";
import { activeBrand } from "@/lib/brand";

/**
 * Contenu imprimable d'une formule, reprenant la mise en page de generate_formula_pdf
 * (app/services/pdf_service.py) : logo, nom du profil, date/référence, notes par famille.
 *
 * Invisible à l'écran (voir @media print dans globals.css), affiché uniquement pendant
 * window.print() — remplacement de l'impression PDF réseau (PrintNode/CUPS) : on laisse
 * l'utilisateur choisir son imprimante dans la boîte de dialogue native du navigateur.
 */
interface PrintableFormulaProps {
  profile: string;
  date: string;
  reference?: string;
  notes: {
    top: FormulaNote[];
    heart: FormulaNote[];
    base: FormulaNote[];
  };
}

function PrintNoteList({ label, notes }: { label: string; notes: FormulaNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="print-formula-section">
      <span className="print-formula-section-label">{label}</span>
      <ul className="print-formula-notes">
        {notes.map((note) => (
          <li key={note.name}>
            <span>— {note.name}</span>
            <span className="print-formula-note-ml">{note.ml} ml</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PrintableFormula({ profile, date, reference, notes }: PrintableFormulaProps) {
  return (
    <div className="print-formula-page">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={activeBrand.logo} alt="" className="print-formula-logo" />
      <hr className="print-formula-hr" />
      <h1 className="print-formula-profile">{profile}</h1>
      {(date || reference) && (
        <p className="print-formula-meta">
          {[date, reference].filter(Boolean).join("   ·   ")}
        </p>
      )}
      <hr className="print-formula-hr print-formula-hr--thin" />
      <PrintNoteList label="NOTES DE TÊTE" notes={notes.top} />
      <PrintNoteList label="NOTES DE CŒUR" notes={notes.heart} />
      <PrintNoteList label="NOTES DE FOND" notes={notes.base} />
      <hr className="print-formula-hr" />
    </div>
  );
}
