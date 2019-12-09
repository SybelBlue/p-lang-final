// start a node instance to run the transpiler
const Transpiler = require('./transpiler');
new Transpiler().compileFile('./local/tex/advanced/main.tex', './local/tex/advanced/transpiled.tex');
