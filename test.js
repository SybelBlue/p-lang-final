let testDocument =
String.raw`\begin{document}
\begin[optional  ][  optional1]{proof}
\begin{TeXjs}
log("hello");
[1,"test",4,6,-2].map(n => out(n));
this.goodbye = function() {
  console.log("bye!");
}
var obj = {x: 3, toString: () => "{x: " + obj.x + "}"};
log(obj);
\end{TeXjs}
\end{  proof   }

\begin[module]{TeXjs}
console.log(this);
this.goodbye();
\end{TeXjs}

\command[optional]{ and stuff }

\begin{TeXjs}
console.log("Doing nothing.");
\end{TeXjs}

\begin{TeXjs}
function entry(i, j) {
  if (i == 3 && j == 4) return "\\ddots";
  if (i == 3) return "\\vdots";
  if (j == 4) return "\\cdots";
  return "a_{" + i + "," + j + "}";
}
array(
  [1,2,3,4, '\ell'].map(i =>
    [1, 2, 3,4, 'n'].map(j => entry(i, j))
  )
)
\end{TeXjs}

\begin{pmatrix}
\begin{TeXjs}
out(tabularString([1,2,3,4, '\ell'].map(sub => ["\\v_" + sub])))
\end{TeXjs}
\end{pmatrix}

\end{document}
`


let transpiler = new TeXTranspiler();
transpiler.compileText(testDocument);
console.log(transpiler);
transpiler.printCurrentAST();
console.log(transpiler.compiledTeX)
