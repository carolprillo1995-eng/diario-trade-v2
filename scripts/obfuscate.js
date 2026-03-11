/**
 * Ofuscação pós-build dos arquivos JS gerados pelo React.
 * Roda após "npm run build" com o comando "npm run obfuscate".
 *
 * Usa configurações conservadoras para não quebrar o React:
 *  - stringArray / rotateStringArray / shuffleStringArray → extrai strings para array cifrado
 *  - identifierNamesGenerator hexadecimal → renomeia variáveis para _0x...
 *  - renameGlobals false → não renomeia globais (quebraria React)
 *  - controlFlowFlattening false → não usa (quebraria bundler)
 */

const JavaScriptObfuscator = require("javascript-obfuscator");
const fs   = require("fs");
const path = require("path");

const BUILD_DIR = path.join(__dirname, "..", "build", "static", "js");

if (!fs.existsSync(BUILD_DIR)) {
  console.error("❌  Pasta build/static/js não encontrada. Rode 'npm run build' primeiro.");
  process.exit(1);
}

const files = fs.readdirSync(BUILD_DIR).filter(
  (f) => f.endsWith(".js") && !f.endsWith(".map")
);

if (files.length === 0) {
  console.error("❌  Nenhum arquivo .js encontrado em build/static/js");
  process.exit(1);
}

console.log(`\n🔒  Ofuscando ${files.length} arquivo(s)...\n`);

files.forEach((file) => {
  const filePath = path.join(BUILD_DIR, file);
  const original = fs.readFileSync(filePath, "utf8");

  try {
    const result = JavaScriptObfuscator.obfuscate(original, {
      compact: true,
      controlFlowFlattening: false,       // seguro para React
      deadCodeInjection: false,           // evita inchaço
      debugProtection: true,              // trava o debugger
      debugProtectionInterval: 2000,      // re-trava a cada 2s
      disableConsoleOutput: true,         // silencia console
      identifierNamesGenerator: "hexadecimal",
      renameGlobals: false,               // não renomear globals
      rotateStringArray: true,
      selfDefending: true,                // detecta se foi formatado
      shuffleStringArray: true,
      splitStrings: false,                // evita overhead
      stringArray: true,
      stringArrayEncoding: ["base64"],
      stringArrayThreshold: 0.75,
      transformObjectKeys: false,         // seguro para React props
      unicodeEscapeSequence: false,
    });

    fs.writeFileSync(filePath, result.getObfuscatedCode(), "utf8");
    const before = (original.length / 1024).toFixed(1);
    const after  = (result.getObfuscatedCode().length / 1024).toFixed(1);
    console.log(`  ✅  ${file}  (${before} KB → ${after} KB)`);
  } catch (err) {
    console.error(`  ⚠️  Erro ao ofuscar ${file}: ${err.message}`);
  }
});

console.log("\n🔐  Ofuscação concluída!\n");
