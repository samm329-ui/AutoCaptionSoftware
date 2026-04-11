import { useEffect, useRef, useState } from "react";

interface ITextDetails {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  textAlign?: string;
  [key: string]: unknown;
}

const TextLayer: React.FC<{
  id: string;
  content?: string;
  onChange?: (id: string, content: string) => void;
  onBlur?: (id: string, content: string) => void;
  style?: React.CSSProperties;
  editable?: boolean;
  details?: ITextDetails;
}> = ({
  id,
  content = "",
  editable,
  style = {},
  onChange,
  onBlur,
  details
}) => {
  const [data, setData] = useState(content);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editable && divRef.current) {
      const element = divRef.current;
      element.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      const selection = window.getSelection();
      selection?.removeAllRanges();
    }
  }, [editable]);

  useEffect(() => {
    if (data !== content) {
      setData(content);
    }
  }, [content]);

  const moveCaretToEnd = () => {
    if (divRef.current) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(divRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const selection = window.getSelection();
    const element = divRef.current;

    if (selection?.rangeCount && element) {
      const range = selection.getRangeAt(0);
      if (range.endOffset - range.startOffset === element.textContent?.length) {
        moveCaretToEnd();
      }
    }
  };

  return (
    <div
      data-text-id={id}
      ref={divRef}
      contentEditable={editable}
      onClick={handleClick}
      onInput={(ev) => onChange?.(id, (ev.target as any).innerText)}
      onBlur={(ev) => onBlur?.(id, (ev.target as any).innerText)}
      style={{
        height: "100%",
        boxShadow: "none",
        outline: "none",
        ...style,
        pointerEvents: editable ? "auto" : "none",
        whiteSpace: "pre-line",
        width: "100%",
        display: "flex",
        alignItems: "center",
        flexDirection: "column",
        justifyContent: "center"
      }}
      suppressContentEditableWarning
      className="designcombo_textLayer"
    >
      {!editable ? content : content}
    </div>
  );
};

export default TextLayer;
