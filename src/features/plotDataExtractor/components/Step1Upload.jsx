export default function Step1Upload({ onLoad }) {
  function handleFile(file) {
    if (file) onLoad(file);
  }

  return (
    <div className="glass-card flex flex-col items-center justify-center p-10" style={{ minHeight: 520 }}>
      <div
        className="flex w-full max-w-xl cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-14 text-slate-400 transition hover:border-cyan-400/40 hover:bg-cyan-500/5 hover:text-slate-200"
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
        onDragOver={e => e.preventDefault()}
        onClick={() => document.getElementById('pde-file-input').click()}
      >
        <svg className="h-16 w-16 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div className="text-center">
          <p className="text-lg font-bold">Drop your plot image here</p>
          <p className="mt-1 text-sm opacity-60">or click to browse — PNG, JPG, BMP, SVG</p>
        </div>
        <div className="mt-2 rounded-xl bg-cyan-500/20 px-6 py-2.5 text-sm font-bold text-cyan-300 hover:bg-cyan-500/30 transition">
          Select Image
        </div>
      </div>
      <input
        id="pde-file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
      <p className="mt-6 text-xs text-slate-500">
        After uploading you will calibrate the axes, then click to extract data points.
      </p>
    </div>
  );
}
