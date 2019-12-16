"use strict";

class TranspileError extends Error {
  constructor(message, line, lineNumber, ...suggestions) {
    super(message, "transpiler.js", lineNumber);
    this.line = line;
    this.lineNumber = lineNumber;
    this.suggestions = suggestions;
  }

  makeFancyMessage() {
    let m = this.message;
    let baseCount = 4;
    let spaceCount = ("" + this.lineNumber).length + baseCount;
    m += "\n" + " ".repeat(spaceCount) + " |\n"
    m += " ".repeat(baseCount) + this.lineNumber + " | " + this.line + "\n"
    m += " ".repeat(spaceCount) + " | " + "^".repeat(this.line.length);
    if (this.suggestions) {
      for (var suggestion of this.suggestions) {
        if (suggestion.length) {
          m += "\n  (" + suggestion + ")";
        }
      }
    }
    return m;
  }
}

class TeXTranspiler {
  constructor() {
    this.currentNode = new ASTNode(null, {line: 0, include: false});
    this.lineCount = 1;
    this.context = {
      log: log,
      array: array,
      out: out
    };
  }

  compileText(text) {
    for (var line of text.split('\n')) {
      this.push(line);
    }
    this.close();
  }

  printCurrentAST() {
    printASTNode(this.currentNode);
  }

  push(line) {
    let node = new ASTNode(this.currentNode, {
      line: this.lineCount++,
      text: line,
      include: true
    });

    let match;
    if (match = line.match(begin("(\\w+)"))) {
      node.data.isModule = moduleStr == match[2];
      node.data.environ = match[3];
      node.data.evaluable = node.data.environ == cmdStr;
      node.data.context = this.context;
      node.data.isBegin = true;
      if (line.trim().length != match[0].length) {
        throw new TranspileError(cmdStr + " environment markers need to be " +
        "on their own lines", node.data.text, node.data.line);
      }
    } else if (match = line.match(end("(\\w+)"))) {
      let matchedEnviron = match[3];

      if (matchedEnviron == cmdStr && line.trim().length != match[0].length) {
        throw new TranspileError(cmdStr + " environment markers need to be " +
        "on their own lines", node.data.text, node.data.line);
      }

      if (this.currentNode.data.environ != matchedEnviron) {
        this.throwEarlyEndError(matchedEnviron, node);
      }

      node.data.environ = matchedEnviron;
      node.data.include = matchedEnviron != cmdStr;
      node.data.isEnd = true;

      this.currentNode.data.endLine = this.lineCount;
      this.currentNode = this.currentNode.parent;
    }

    this.currentNode.children.push(node);
    if(node.data.isBegin) {
      this.currentNode = node;
    }
  }

  close() {
    if (this.currentNode.parent) {
      let data = this.currentNode.data;
      throw new TranspileError(String.raw`I hit the end of the script before ` +
      String.raw`'${data.environ}' on line ${data.line} was closed!`,
      data.text, data.line,
      String.raw`Try putting \end{${data.environ}} call on the last line.`);
    }
    this.refreshCompiledTeX();
  }

  refreshCompiledTeX() {
    this.compiledTeX = this.currentNode.evaluate().join('\n');
  }

  throwEarlyEndError(matchedEnviron, node) {
    let last = this.currentNode.data;
    if (this.currentNode.parentScope()
        .map(p => p.data.environ).includes(matchedEnviron)) {
      throw new TranspileError(
        String.raw`I tried to end the '${matchedEnviron}' environment at ` +
        String.raw`line ${node.data.line}, but I need to end the ` +
        String.raw`'${last.environ}' environment starting at line ` +
        String.raw`${last.line} first!`,
        node.data.text, node.data.line,
        "Try putting an end call between lines " +
        String.raw`${last.line} and ${node.data.line}.`
      );
    } else {
      throw new TranspileError(
        String.raw`I tried to end the environment '${matchedEnviron}' at line ` +
        String.raw`${node.data.line}, but \begin{${matchedEnviron}} was ` +
        "never called!",
        node.data.text, node.data.line,
        "Try putting a begin call between lines " +
        String.raw`${last.line} and ${node.data.line}.`,
        node.parent && node.parent.data.environ ?
          String.raw`Did you mean "${node.parent.data.environ}"?` :
          ""
      );
    }
  }
}
