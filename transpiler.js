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
  }
  evaluate() {
    let childEvals = this.children.map(c => c.evaluate()).flat();
    if (!this.data || !this.data.include) return childEvals;
    if (!this.data.evaluable) return [this.data.text, ...childEvals];
    // this.context.clear();
    outLines = [];
    evalInContext(childEvals.join('\n'), this.data.context);
    let outText = outLines.join('\n');
    return [outText.length ?
      outText :
      String.raw`% I generated nothing at line ${this.data.line}! Try using out().`];
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

class TeXInterpreter {
  constructor() {
    this.currentNode = new ASTNode(null, {line: 0, include: false});
    this.lineCount = 1;
    this.context = {
      out: out
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
      let matchedRegion = match[2];
      if (last.region != matchedRegion) {
        console.log(this.currentNode);
        if (this.currentNode.parentScope().map(p => p.data.region).includes(matchedRegion)) {
          throw new Error(
            String.raw`I tried to end the region '${matchedRegion}' at line ` +
            String.raw`${node.data.line}, but I need to end the region ` +
            String.raw`'${last.region}' starting at line ${last.line} first!`
          );
        } else {
          throw new Error(
            String.raw`I tried to end the region '${matchedRegion}' at line ` +
            String.raw`${node.data.line}, but \begin{${matchedRegion}} was ` +
            "never called!"
          );
        }
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
    if (this.currentNode.parent) {
      let data = this.currentNode.data;
      throw new Error(String.raw`I hit the end of the script before ` +
      String.raw`'${data.region}' on line ${data.line} was closed!`);
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

function array() {

}

let testDocument = String.raw`
\begin{document}
\begin{proof}
\begin{${cmdStr}}
globalFunc("I'm printing!!!");
[1,"test",4,6,-2].map(n => out(n));
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
