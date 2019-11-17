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
