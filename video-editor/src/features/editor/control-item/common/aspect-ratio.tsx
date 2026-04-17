import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";

export default function AspectRatio() {
  const [value, setValue] = useState("locked");
  const onChangeAligment = (value: string) => {
    setValue(value);
  };
  return (
    <div className="flex gap-1 items-center">
      <div className="text-[10px] text-muted-foreground w-12 shrink-0">Lock</div>
      <ToggleGroup
        value={value}
        className="h-5 text-[9px] grid grid-cols-2"
        type="single"
        onValueChange={onChangeAligment}
      >
        <ToggleGroupItem value="locked" className="h-4 px-1">Yes</ToggleGroupItem>
        <ToggleGroupItem value="unlocked" className="h-4 px-1">No</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
