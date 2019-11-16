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

const cmdStr = "TeXjs";

class Region {
  constructor(line, region) {
    this.line = line;
    this.region = region;
    this.evaluable = region == cmdStr;
  }
  toString() {
    return String.raw`${this.region} at line ${this.line}`;
  }
}

class ASTNode {
  constructor(parent, data) {
    this.parent = parent;
    this.children = [];
    this.data = data;
  }
  lastChild() {
    return this.children[this.children.length - 1];
  }
}

class TeXInterpreter {
  constructor() {
    this.stack = [];
    this.ast = null;
    this.text = [];
    this.lineCount = 0;
  }
  
  push(line) {
    this.lineCount++;
    this.text.push(line);
    let match;
    if (match = line.match(begin("(\\w+)"))) {
      let region = new Region(this.lineCount, match[2]);
      this.stack.push(region);
      
    } else if (match = line.match(end("(\\w+)"))) {
      let last = this.stack.pop();
      if (last.region != match[2]) {
        throw new Error("Illegal End of Region " + last.toString());
      }
      if (last.evaluable) {
        let start = last.line;
        let end = this.lineCount - 1;
        let evalText = this.text.slice(start, end).join("\n");
        evalInContext(evalText, this);
      }
    }
  }

  $() {
    console.log("hello")
  }

  close() {
    if (this.stack.length) 
      throw new Error("Unclosed Regions: " + this.stack.map(obj => obj.toString()));
  }
}

function globalFunc() {
  console.log(arguments);
}

// https://stackoverflow.com/questions/8403108/calling-eval-in-particular-context
function evalInContext(js, context) {
    //# Return the results of the in-line anonymous function we .call with the passed context
    return function() { return eval(js); }.call(context);
}


let testDocument = String.raw`
\begin{document}
\begin{proof}
\begin{${cmdStr}}
globalFunc("I'm printing!!!");
this.push("Internal proof");
this.goodbye = function() {
  console.log("bye!");
}
global.hello = function() {
  console.log("hello world!");
}
\end{${cmdStr}}
\end{  proof   }

\begin{${cmdStr}}
hello();
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

hello();
