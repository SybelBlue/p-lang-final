"use strict";

class TranspileError extends Error {
  constructor(message, line, lineNumber, suggestion) {
    super(message, "transpiler.js", lineNumber);
    this.line = line;
    this.lineNumber = lineNumber;
    this.suggestion = suggestion;
  }

  makeFancyMessage() {
    let m = this.message;
    let spaceCount = ("" + this.lineNumber).length + 4;
    m += "\n" + " ".repeat(spaceCount) + " |\n"
    m += " ".repeat(4) + this.lineNumber + " | " + this.line + "\n"
    m += " ".repeat(spaceCount) + " | " + "^".repeat(this.line.length);
    if (this.suggestion) {
      m += "\n  (" + this.suggestion + ")";
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
      node.data.region = match[3];
      node.data.evaluable = node.data.region == cmdStr;
      node.data.context = this.context;
      node.data.isBegin = true;
    } else if (match = line.match(end("(\\w+)"))) {
      let matchedRegion = match[3];

      if (this.currentNode.data.region != matchedRegion) {
        this.throwEarlyEndError(matchedRegion, node);
      }

      node.data.region = matchedRegion;
      node.data.include = matchedRegion != cmdStr;
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
      String.raw`'${data.region}' on line ${data.line} was closed!`,
      data.text, data.line);
    }
    this.refreshCompiledTeX();
  }

  refreshCompiledTeX() {
    this.compiledTeX = this.currentNode.evaluate().join('\n');
  }

  throwEarlyEndError(matchedRegion, node) {
    let last = this.currentNode.data;
    if (this.currentNode.parentScope()
        .map(p => p.data.region).includes(matchedRegion)) {
      throw new TranspileError(
        String.raw`I tried to end the region '${matchedRegion}' at line ` +
        String.raw`${node.data.line}, but I need to end the region ` +
        String.raw`'${last.region}' starting at line ${last.line} first!`,
        node.data.text, node.data.line,
        "Try putting an end call between lines " +
        String.raw`${last.line} and ${node.data.line}.`
      );
    } else {
      throw new TranspileError(
        String.raw`I tried to end the region '${matchedRegion}' at line ` +
        String.raw`${node.data.line}, but \begin{${matchedRegion}} was ` +
        "never called!",
        node.data.text, node.data.line,
        "Try putting a begin call between lines " +
        String.raw`${last.line} and ${node.data.line}.`
      );
    }
  }
}
