import React from "react";
import { Button } from "antd";

export function RichTextEditor(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== props.value) {
      editorRef.current.innerHTML = props.value;
    }
  }, [props.value]);
  const exec = (command: string) => {
    document.execCommand(command);
  };
  return (
    <div className="rte">
      <div className="rte-toolbar">
        <Button size="small" onClick={() => exec("bold")}>
          加粗
        </Button>
        <Button size="small" onClick={() => exec("italic")}>
          斜体
        </Button>
        <Button size="small" onClick={() => exec("underline")}>
          下划线
        </Button>
        <Button size="small" onClick={() => exec("insertUnorderedList")}>
          列表
        </Button>
      </div>
      <div
        ref={editorRef}
        className="rte-editor"
        contentEditable
        data-placeholder={props.placeholder ?? "输入公告内容..."}
        onInput={(event) => props.onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}
