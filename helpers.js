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

// https://stackoverflow.com/questions/8403108/calling-eval-in-particular-context
function evalInContext(js, context) {
    // Return the results of the in-line anonymous function we .call with the passed context
    return function() { return eval(js); }.call(context);
}

let outLines = [];
function out(...lines) {
  outLines.push(...lines.map(l => l.toString()));
}

function array(table, alignment=null) {
  out(
String.raw`\begin{array}{${alignment || " " + "c ".repeat(table[0].length)}}
${table.map(row => row.join(" & ")).join(" \\\\ \n")}
\end{array}`
  )
}

function log(...any) {
  console.log(...any);
  outLines.push(...any.map(m => "% " + m.toString()));
}

function warn(...any) {
  console.warn(...any);
  outLines.push(...any.map(m => "% ⚠ " + m.toString()))
}

function $(expr) {
  if (expr) out("$" + expr + "$")
  else out("$");
}

function $$(expr) {
  if (expr) out("$$" + expr + "$$")
  else out("$$");
}
