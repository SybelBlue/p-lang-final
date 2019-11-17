"use strict";

function validName(name) {
  return name.match(/\s+/) == null;
}
String.prototype.validName = function() { return validName(this) };
String.prototype.enforceValid = function() {
  if (!this.validName()) {
    throw new Error("String " + this + " is invalid name.");
  }
}

String.prototype.asRegex = function() { return new RegExp(this); }

String.prototype.includesRegex = function(str) {
  return this.match(str.asRegex()) != null;
}

function commandStringWithArgument(command, argument) {
  command.enforceValid();
  return String.raw`(\\${command}(?:\[\s*(\w*)\s*\])*\{\s*${argument}\s*\})`
}

function command(name) {
  return commandStringWithArgument(name, "\\w*");
}
String.prototype.asCommand = function() { return command(this); }


function begin(name) {
  return commandStringWithArgument("begin", name);
}

function end(name) {
  return commandStringWithArgument("end", name);
}

Array.prototype.last = function() { return this[this.length - 1]; }

const cmdStr = "TeXjs";
const moduleStr = "module";

function printASTNode(node, depth=-1) {
  depth < 0 || console.log("   ".repeat(depth), node.data);
  if (!node.children.length) return;
  for (var child of node.children) {
    printASTNode(child, depth + 1);
  }
}

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
    evalInContext(childEvals.join('\n'), this.data.context);
    let outText = outLines.join('\n');

    if (this.data.isModule) return [outText];

    if (outText.length) {
      return [String.raw`% Results of region at line ${this.data.line}: `
        + '\n' + outText]
    }

    let warning = String.raw`% I generated nothing at line ${this.data.line}! `
        + "Try using out(...) or log(...).";
    console.warn(warning)
    return [warning];
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
      throw new Error(String.raw`I hit the end of the script before ` +
      String.raw`'${data.region}' on line ${data.line} was closed!`);
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
      throw new Error(
        String.raw`I tried to end the region '${matchedRegion}' at line ` +
        String.raw`${node.data.line}, but I need to end the region ` +
        String.raw`'${last.region}' starting at line ${last.line} first!`
      );
    } else {
      throw new Error(
        String.raw`I tried to end the region '${matchedRegion}' at line ` +
        String.raw`${node.data.line}, but \begin{${matchedRegion}} was ` +
        "never called! Try putting a begin call between lines " +
        String.raw`${last.line} and ${node.data.line}.`
      );
    }
  }
}


// https://stackoverflow.com/questions/8403108/calling-eval-in-particular-context
function evalInContext(js, context) {
    //# Return the results of the in-line anonymous function we .call with the passed context
    return function() { return eval(js); }.call(context);
}

let outLines = [];
function out(...lines) {
  outLines.push(...lines.map(l => l.toString()));
}

function array(table, alignment=null) {
  out(
String.raw`$$\begin{array}{${alignment || " " + "c ".repeat(table[0].length)}}
${table.map(row => row.join(" & ")).join(" \\\\ \n")}
\end{array}$$`
  )
}

function log(...any) {
  console.log(...any);
  outLines.push(...any.map(m => "% " + m.toString()));
}

function $(expr) {
  out("$" + expr + "$");
}

let testDocument = String.raw`
\begin{document}
\begin[optional  ][  optional1]{proof}
\begin{${cmdStr}}
log("hello");
[1,"test",4,6,-2].map(n => out(n));
this.goodbye = function() {
  console.log("bye!");
}
var obj = {x: 3, toString: () => "{x: " + obj.x + "}"};
log(obj);
\end{${cmdStr}}
\end{  proof   }

\begin[module]{${cmdStr}}
console.log(this);
this.goodbye();
\end{${cmdStr}}

\command[optional]{ and stuff }

\begin{${cmdStr}}
console.log("Doing nothing.")
\end{${cmdStr}}

\begin{${cmdStr}}
array([[11,12,13],[21,22,23]])
\end{${cmdStr}}

\end{document}
`


let transpiler = new TeXTranspiler();
transpiler.compileText(testDocument);
// console.log(transpiler);
transpiler.printCurrentAST();
console.log(transpiler.compiledTeX)
