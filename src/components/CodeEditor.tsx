import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { cpp } from "@codemirror/lang-cpp";
import { indentUnit, bracketMatching, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";

export interface CodeEditorHandle {
  /** Replace the whole document, e.g. for a "reset to starter code" button. */
  setContent: (content: string) => void;
  getContent: () => string;
}

interface CodeEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  minHeight?: string;
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { initialValue, onChange, readOnly = false, minHeight = "220px" },
  ref,
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    setContent(content: string) {
      const view = viewRef.current;
      if (!view) return;
      const current = view.state.doc.toString();
      view.dispatch({ changes: { from: 0, to: current.length, insert: content } });
    },
    getContent() {
      return viewRef.current?.state.doc.toString() ?? "";
    },
  }));

  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        indentUnit.of("    "),
        cpp(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        oneDark,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
        }),
        EditorView.theme({
          "&": { fontSize: "13.5px", minHeight },
          ".cm-scroller": { fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", minHeight },
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount once; content resets go through the imperative handle, not props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="cm-host rounded-md overflow-hidden border border-slate-700" />;
});

export default CodeEditor;
