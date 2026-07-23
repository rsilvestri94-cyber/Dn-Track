export const btnBase =
  'w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-field border-none px-4 py-3.5 text-sm font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45';
export const btnPrimary = `${btnBase} bg-primary text-white active:bg-primary-active`;
export const btnGhost = `${btnBase} border border-border bg-surface-2 text-text`;

export const card = 'mb-4 rounded-card border border-border bg-surface p-4';
export const sectionTitle = 'mb-3 text-[13px] font-bold uppercase tracking-wide text-muted';

export const inputBase = 'w-full rounded-[8px] border border-border bg-bg px-2.5 py-2.5 font-inherit text-sm font-semibold text-text outline-none focus:border-primary';

export const fieldStateClasses = {
  ok: 'border-ok/40',
  warn: 'border-warn bg-warn-bg',
  err: 'border-err bg-err-bg',
};
