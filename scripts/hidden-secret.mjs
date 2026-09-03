#!/usr/bin/env node
/*
 * Genera la línea SECRET de src/assets/hidden.js a partir de una frase.
 *
 *   pnpm hidden:secret "mi frase"
 *
 * Imprime la línea que hay que pegar en hidden.js. La frase no se guarda en
 * ningún sitio: en el código solo queda su longitud y el hash.
 *
 * El hash no es criptográfico —es el mismo FNV de dos pasadas que usa el
 * navegador— y solo sirve para que la frase no se lea en el JS publicado.
 */

const hash = (text) => {
  let a = 0x811c9dc5, b = 0x01000193;
  for (const ch of text.toLowerCase()) {
    const c = ch.codePointAt(0);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ (c + 0x9e3779b9), 0x85ebca6b) >>> 0;
  }
  return a.toString(36).padStart(7, '0') + b.toString(36).padStart(7, '0');
};

const phrase = process.argv.slice(2).join(' ').trim();

if (!phrase) {
  console.error('Uso: pnpm hidden:secret "tu frase secreta"');
  process.exit(1);
}

if (!/^[\x20-\x7e]+$/.test(phrase)) {
  console.error('Usa solo letras, dígitos y signos ASCII: se compara tecla a tecla.');
  process.exit(1);
}

const normalized = phrase.toLowerCase();

console.log(`
Pega esta línea en src/assets/hidden.js:

  const SECRET = { len: ${[...normalized].length}, hash: '${hash(normalized)}' };

La frase se teclea sin modificadores, en cualquier diapositiva del mazo
(no distingue mayúsculas). Se teclea otra vez para volver a bloquear.
`.trim());
