// lib/textNormalize.ts
export const toHiragana = (s: string) =>
  s.replace(/[ァ-ン]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));

export const stripBrackets = (s: string) =>
  s
    .replace(/[\(\（][^\)\）]*[\)\）]/g, "")
    .replace(/[「『\[\{〈《【][^』」\]\}〉》】]*[』」\]\}〉》】]/g, "");

export const canon = (s?: string) => {
  let x = (s ?? "").normalize("NFKC").toLowerCase();
  x = x.replace(/\s+/g, "");
  x = toHiragana(x);
  x = stripBrackets(x);
  x = x.replace(/ー/g, "");
  x = x.replace(/[・･\.\,，、\/／\-\–—_]/g, "");
  return x;
};
