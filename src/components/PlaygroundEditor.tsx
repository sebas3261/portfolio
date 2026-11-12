import { useEffect, useRef } from "react";
import { EditorState, Prec } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import {
  indentOnInput,
  bracketMatching,
  indentUnit,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { oneDarkTheme } from "@codemirror/theme-one-dark";

// Match the GitHub Dark palette used by the article's Shiki blocks.
const articleHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#ff7b72" },
  { tag: [tags.operator, tags.operatorKeyword], color: "#ff7b72" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "#d2a8ff" },
  { tag: [tags.typeName, tags.className], color: "#ffa657" },
  { tag: tags.standard(tags.typeName), color: "#ff7b72" },
  { tag: [tags.number, tags.bool, tags.null, tags.constant(tags.variableName)], color: "#79c0ff" },
  { tag: [tags.string, tags.regexp], color: "#a5d6ff" },
  { tag: tags.comment, color: "#8b949e" },
]);

export default function PlaygroundEditor({
  value,
  onChange,
  language,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  language: string;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null),
    editor = useRef<EditorView | null>(null),
    change = useRef(onChange);
  change.current = onChange;
  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          indentUnit.of("    "),
          language === "java" ? java() : javascript(),
          oneDarkTheme,
          syntaxHighlighting(articleHighlight),
          keymap.of([
            indentWithTab,
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.contentAttributes.of({
            "aria-label": label,
            spellcheck: "false",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) change.current(update.state.doc.toString());
          }),
          Prec.highest(
            EditorView.theme({
              "&": { fontSize: "13px", color: "#c9d1d9", backgroundColor: "#24292e" },
              ".cm-scroller": {
                fontFamily:
                  "'SFMono-Regular',Consolas,'Liberation Mono',monospace",
                lineHeight: "1.8",
                overflow: "auto",
                minHeight: "400px",
                maxHeight: "620px",
              },
              ".cm-content": { padding: "20px 0", tabSize: "4" },
              ".cm-gutters": {
                backgroundColor: "#24292e",
                color: "#71717a",
                border: "none",
                paddingRight: "12px",
              },
              ".cm-line": { padding: "0 20px 0 8px" },
              ".cm-activeLine,.cm-activeLineGutter": {
                backgroundColor: "#ffffff04",
              },
              "&.cm-focused": { outline: "none" },
            }),
          ),
        ],
      }),
    });
    editor.current = view;
    return () => {
      view.destroy();
      editor.current = null;
    };
  }, [language, label]);
  useEffect(() => {
    const view = editor.current;
    if (view && view.state.doc.toString() !== value)
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
  }, [value]);
  return <div className="playground-editor" ref={host} />;
}
