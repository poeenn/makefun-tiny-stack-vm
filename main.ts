// Tiny stack VM: wrapping 32-bit ints, 256 stack, 64 calls, 256 words, traps 2..11.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input', O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const IMM = new Int8Array(256).fill(-1), POP = new Int8Array(256), PSH = new Int8Array(256);
const V = [0,1,2,3,4,5,6,7,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,32,33,34,48,49,50,51,52,64,65,80,81,82,83];
const AI = '0140000000000000000000000022220000000', AP = '0001122322222221222122222201100121101', AQ = '0110223311111111111111111100000100010';
for (let k = 0; k < V.length; k++) { IMM[V[k]] = +AI[k]; POP[V[k]] = +AP[k]; PSH[V[k]] = +AQ[k]; }
const enc = new TextEncoder();
function run(P, N) {
  const n = P.length, S = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256), U = new Uint8Array(65536);
  let s = 0, c = 0, l = 0, i = 0, p = 0, t = 0;
  const D = (code) => ({ out: U.slice(0, l), code });
  for (;;) {
    if (t === 1e6) return D(10);
    if (p < 0 || p >= n) return D(9);
    const o = P[p], m = IMM[o];
    if (m < 0) return D(5);
    if (p + m >= n) return D(9);
    t++;
    const x = p + 1 + m;
    if (s < POP[o]) return D(2);
    if (s - POP[o] + PSH[o] > 256) return D(3);
    p = x;
    switch (o) {
      case 0: return D(0);
      case 1: S[s++] = (P[x - 1] << 24) >> 24; break;
      case 2: S[s++] = P[x - 4] | (P[x - 3] << 8) | (P[x - 2] << 16) | (P[x - 1] << 24); break;
      case 3: s--; break;
      case 4: S[s] = S[s - 1]; s++; break;
      case 5: { const v = S[s - 1]; S[s - 1] = S[s - 2]; S[s - 2] = v; break; }
      case 6: S[s] = S[s - 2]; s++; break;
      case 7: { const v = S[s - 3]; S[s - 3] = S[s - 2]; S[s - 2] = S[s - 1]; S[s - 1] = v; break; }
      case 23: S[s - 1] = -S[s - 1] | 0; break;
      case 27: S[s - 1] = ~S[s - 1]; break;
      case 48: case 49: case 50: {
        const r = ((P[x - 2] | (P[x - 1] << 8)) << 16) >> 16;
        if (o === 48 || (o === 49 ? S[--s] === 0 : S[--s] !== 0)) p = x + r;
        break;
      }
      case 51: if (c === 64) return D(7); C[c++] = x; p = P[x - 2] | (P[x - 1] << 8); break;
      case 52: if (c === 0) return D(8); p = C[--c]; break;
      case 64: { const a = S[s - 1]; if (a < 0 || a > 255) return D(6); S[s - 1] = M[a]; break; }
      case 65: { const a = S[s - 1]; if (a < 0 || a > 255) return D(6); M[a] = S[s - 2]; s -= 2; break; }
      case 80: { const b = enc.encode(String(S[s - 1])); if (l + b.length > 65536) return D(11); s--; U.set(b, l); l += b.length; break; }
      case 81: if (l + 1 > 65536) return D(11); U[l++] = S[--s] & 255; break;
      case 82: S[s++] = i < N.length ? N[i++] : -1; break;
      case 83: return D(S[--s] & 255);
      default: {
        const b = S[s - 1], a = S[s - 2]; let r;
        if (o === 16) r = (a + b) | 0;
        else if (o === 17) r = (a - b) | 0;
        else if (o === 18) r = Math.imul(a, b);
        else if (o === 19) { if (!b) return D(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
        else if (o === 20) { if (!b) return D(4); r = b === -1 ? 0 : (a % b) | 0; }
        else if (o === 21) { if (!b) return D(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
        else if (o === 22) { if (!b) return D(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
        else if (o === 24) r = a & b;
        else if (o === 25) r = a | b;
        else if (o === 26) r = a ^ b;
        else if (o === 28) r = a << (b & 31);
        else if (o === 29) r = a >> (b & 31);
        else if (o === 30) r = (a >>> (b & 31)) | 0;
        else if (o === 32) r = a === b ? 1 : 0;
        else if (o === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        s -= 2; S[s++] = r;
      }
    }
  }
}
for (const id of readdirSync(I).sort()) {
  const { out, code } = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), out);
  writeFileSync(join(O, id, 'exit.txt'), code + '\n');
}
