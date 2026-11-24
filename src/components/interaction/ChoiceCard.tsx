"use client";

interface ChoiceCardProps {
  name: string;
  /** Numéro affiché dans une pastille (l'utilisateur peut dire « le 4 ») */
  number?: number;
  imageUrl?: string;
  selected?: boolean;
  clickable?: boolean;
  onSelect: (name: string) => void;
}

export default function ChoiceCard({ name, number, imageUrl, selected, clickable = true, onSelect }: ChoiceCardProps) {
  return (
    <div
      onClick={() => clickable && onSelect(name)}
      className={`h-full min-h-0 rounded-2xl overflow-hidden group border-2 transition-all duration-300 relative bg-stone-200 ${
        clickable ? "cursor-pointer" : "cursor-default"
      } ${selected ? "border-primary scale-[1.03]" : clickable ? "border-transparent hover:border-primary/60" : "border-transparent"}`}
    >
      {imageUrl ? (
        <>
          <div
            className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url('${imageUrl}')` }}
          />
          <div className={`absolute inset-0 transition-colors duration-300 ${selected ? "bg-primary/20" : "bg-stone-900/10 group-hover:bg-transparent"}`} />
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-stone-800 to-stone-900" />
      )}

      {number !== undefined && (
        <div className={`absolute top-2 left-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-md ${
          selected ? "bg-primary text-white" : "bg-white/90 text-stone-900"
        }`}>
          {number}
        </div>
      )}

      {/* Label en bas */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/30 backdrop-blur-sm py-1.5 sm:py-2 text-center">
        <span className="text-white text-[10px] sm:text-xs tracking-widest uppercase font-semibold drop-shadow-md">
          {name}
        </span>
      </div>

      {/* Coche de sélection au centre */}
      {selected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-primary rounded-full p-2 shadow-xl">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
