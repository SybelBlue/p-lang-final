// arbitrary command
// \\\w+(\s*\[.+\])*\s*\{(.*)\}
// command or environment
const texLiteralRe = /(\\begin\s*(?:\s*\[.*\])*\s*\{(.*?)\}(?:.*?\n?)*?\\end\s*\{\s*\2\s*\})|(\\\w+(?:(?:\s*\[.*\])*\s*\{(?:.*?)\})?)/g;

class ASTNode {
  constructor(parent, data) {
    this.parent = parent;
    this.children = [];
    this.data = data;
  }

  evaluate() {
    let childEvals = this.children.map(c => c.evaluate()).flat();
    if (!this.data || !this.data.include) return childEvals;
    if (!this.data.evaluable) return [this.data.text, ...childEvals];
    outLines = this.data.isModule ?
      [String.raw`% Module at line ${this.data.line} compiled successfully! `] :
      [];
    try {
      let body = childEvals.join('\n');
      // replace body instances of TeX Literals
      let newBody = body.replace(texLiteralRe, function(str) {
        return "String.raw\`" + String.raw`${str}` + "\`";
      });

      evalInContext(newBody, this.data.context);
    } catch(e) {
      console.warn(e);
      throw new TranspileError(
        String.raw`I couldn't evaluate because an error was thrown:
        ${e.message}`, this.data.text, this.data.line,
        "Something's wrong with my internal js code for this environment..."
      );
    }
    let outText = outLines.join('\n');

    if (this.data.isModule) return [outText];

    if (outText.length) {
      return [String.raw`% Results of environment at line ${this.data.line}: `
        + '\n' + outText]
    }

    let warning = String.raw`I generated nothing at line ${this.data.line}! `
        + "Try using out(...), log(...), or warn(...).";
    warn(warning);
    return outLines;
  }

  parentScope(includeSelf=false) {
    let parents = [];
    let current = includeSelf ? this : this.parent;
    while (current) {
      parents.push(current);
      current = current.parent;
    }
    return parents;
  }
}
