export default function Footer() {
  return (
    <footer className="border-t border-arcade-pink/20 bg-black/40 py-10 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-arcade-pink text-xl">
              🕹️
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-pixel text-sm font-bold text-arcade-cyan">PIXEL HAVEN</span>
              <span className="text-[10px] tracking-widest text-slate-500">ARCADE RETRO</span>
            </div>
          </div>

          <p className="text-xs font-pixel text-slate-500">
            © 2026 PIXEL HAVEN. TODOS LOS DERECHOS RESERVADOS.
          </p>

          <div className="flex gap-4 text-lg">
            <span title="Twitter / X">🐦</span>
            <span title="Instagram">📷</span>
            <span title="YouTube">📺</span>
            <span title="Discord">💬</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
