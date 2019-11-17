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
  return String.raw`(\\${command}\{\s*${argument}\s*\})`
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
    // this.context = new EvalContext();
  }
  evaluate() {
    var childEvals = this.children.map(c => c.evaluate()).flat();
    if (!this.data || !this.data.include) return childEvals;
    if (!this.data.evaluable) return [this.data.text, ...childEvals];
    // this.context.clear();
    outLines = [];
    evalInContext(childEvals.join('\n'), this.data.context);
    return [outLines.join('\n')];
  }
}

class TeXInterpreter {
  constructor() {
    this.currentNode = new ASTNode(null, null);
    this.lineCount = 0;
    this.context = {
      out: out,

    };
  }

  push(line) {
    let node = new ASTNode(this.currentNode, {
      line: this.lineCount++,
      text: line,
      include: true
    });

    let match;
    if (match = line.match(begin("(\\w+)"))) {
      node.data.region = match[2];
      node.data.evaluable = node.data.region == cmdStr;
      node.data.context = this.context;
      this.currentNode.children.push(node);
      this.currentNode = node;
    } else if (match = line.match(end("(\\w+)"))) {
      let last = this.currentNode.data;
      if (last.region != match[2]) {
        throw new Error("Illegal End of Region " + last.toString());
      }
      this.currentNode.data.endLine = this.lineCount;
      this.currentNode = this.currentNode.parent;
      node.data.include = match[2] != cmdStr;
      this.currentNode.children.push(node);
    } else {
      node.data.text = line;
      this.currentNode.children.push(node);
    }
  }

  close() {
    if (this.currentNode.data) {
      let data = this.currentNode.data;
      throw new Error(String.raw`Unclosed Region '${data.region}' on line ${data.line}.`);
    }
    this.compiledTeX = this.currentNode.evaluate().join('\n');
  }
}


// https://stackoverflow.com/questions/8403108/calling-eval-in-particular-context
function evalInContext(js, context) {
    //# Return the results of the in-line anonymous function we .call with the passed context
    return function() { return eval(js); }.call(context);
}

function globalFunc() { console.log(arguments); }

let outLines = [];
function out(...lines) {
  outLines.push(...lines.map(l => l.toString()));
}

let testDocument = String.raw`
\begin{document}
\begin{proof}
\begin{${cmdStr}}
globalFunc("I'm printing!!!");
out(3);
this.goodbye = function() {
  console.log("bye!");
}
\end{${cmdStr}}
\end{  proof   }

\begin{${cmdStr}}
console.log(this);
this.goodbye();
\end{${cmdStr}}
\end{document}
`

let stack = new TeXInterpreter();
for (var line of testDocument.split('\n')) {
  stack.push(line);
}
stack.close();
console.log(stack);
printASTNode(stack.currentNode);
console.log(stack.compiledTeX)
