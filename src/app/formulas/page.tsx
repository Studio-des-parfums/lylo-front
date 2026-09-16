"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import MaterialIcon from "@/components/ui/MaterialIcon";
import FormulaCard from "@/components/recommendations/FormulaCard";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { FormulaSize } from "@/context/SessionContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const PAGE_SIZE = 100;

interface FormulaRow {
  id: number;
  reference: string;
  customer_name: string | null;
  customer_email: string | null;
  profile: string | null;
  formula_type: string | null;
  language: string | null;
  created_at: string | null;
  sizes: {
    "10ml": FormulaSize;
    "30ml": FormulaSize;
    "50ml": FormulaSize;
  } | null;
}

interface FormulasResponse {
  total: number;
  page: number;
  limit: number;
  results: FormulaRow[];
}

export default function FormulasPage() {
  const { t } = useTranslation();
  const { user, isInitialized } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FormulasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormula, setSelectedFormula] = useState<FormulaRow | null>(null);

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace("/");
    }
  }, [isInitialized, user]);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      search: debouncedSearch,
    });
    fetch(`${API_BASE}/api/formulas?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error(t("formulas.loadError"));
        return r.json();
      })
      .then((json: FormulasResponse) => setData(json))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, page, debouncedSearch]);

  if (!isInitialized || !user) return null;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="relative min-h-dvh w-full flex flex-col bg-background-light">
      <Navbar showActions={false} />

      <main className="flex-1 flex flex-col px-4 sm:px-8 lg:px-20 pt-24 pb-12 max-w-[1200px] w-full mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1">
          {t("formulas.title")}
        </h1>
        <p className="text-primary/80 text-sm mb-6">{t("formulas.subtitle")}</p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("formulas.searchPlaceholder")}
          className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-primary/15 bg-white text-sm text-primary placeholder:text-primary/35 outline-none focus:border-primary/40 mb-6"
        />

        {error && (
          <p className="text-red-600 text-sm mb-4">{error}</p>
        )}

        <div className="rounded-xl border border-primary/10 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/10 text-left text-primary/70 uppercase text-[11px] tracking-wide">
                <th className="px-4 py-3 font-semibold">{t("formulas.colReference")}</th>
                <th className="px-4 py-3 font-semibold">{t("formulas.colCustomer")}</th>
                <th className="px-4 py-3 font-semibold">{t("formulas.colEmail")}</th>
                <th className="px-4 py-3 font-semibold">{t("formulas.colType")}</th>
                <th className="px-4 py-3 font-semibold">{t("formulas.colDate")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-primary/70">
                    {t("formulas.loading")}
                  </td>
                </tr>
              ) : data && data.results.length > 0 ? (
                data.results.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => f.sizes && setSelectedFormula(f)}
                    className={`border-b border-primary/5 last:border-0 hover:bg-primary/[0.03] ${
                      f.sizes ? "cursor-pointer" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-primary font-medium">{f.reference}</td>
                    <td className="px-4 py-3 text-primary">{f.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-primary">{f.customer_email || "—"}</td>
                    <td className="px-4 py-3 text-primary">{f.formula_type || "—"}</td>
                    <td className="px-4 py-3 text-primary/80">
                      {f.created_at ? new Date(f.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-primary/70">
                    {t("formulas.noResults")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6">
          <p className="text-primary/70 text-xs">
            {data ? t("formulas.totalCount").replace("{count}", String(data.total)) : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-primary/15 text-sm text-primary disabled:opacity-30 hover:bg-primary/5"
            >
              {t("formulas.prev")}
            </button>
            <span className="text-sm text-primary">
              {t("formulas.pageOf")
                .replace("{page}", String(page))
                .replace("{totalPages}", String(totalPages))}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg border border-primary/15 text-sm text-primary disabled:opacity-30 hover:bg-primary/5"
            >
              {t("formulas.next")}
            </button>
          </div>
        </div>
      </main>

      {selectedFormula && selectedFormula.sizes && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelectedFormula(null)}
        >
          <div
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedFormula(null)}
              aria-label={t("formulas.close")}
              className="absolute -top-3 -right-3 z-10 flex items-center justify-center size-8 rounded-full bg-white text-primary/70 shadow-md hover:text-primary"
            >
              <MaterialIcon name="close" className="text-[18px]" />
            </button>
            <FormulaCard
              name={selectedFormula.reference}
              sizes={selectedFormula.sizes}
            />
          </div>
        </div>
      )}
    </div>
  );
}
