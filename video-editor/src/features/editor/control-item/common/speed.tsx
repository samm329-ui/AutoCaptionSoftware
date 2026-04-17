import { Input } from "@/components/ui/input";

import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";

const Speed = ({
  value,
  onChange
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [localValue, setLocalValue] = useState<string | number>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== "") {
      onChange(Number(localValue));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (localValue !== "") {
        onChange(Number(localValue));
      }
    }
  };

  return (
    <div className="flex gap-1 items-center">
      <div className="text-[10px] text-muted-foreground w-12 shrink-0">Speed</div>
      <Slider
        value={[Number(localValue)]}
        onValueChange={(e) => setLocalValue(e[0])}
        onValueCommit={() => onChange(Number(localValue))}
        min={0}
        max={4}
        step={0.1}
        className="flex-1 h-1"
      />
      <Input
        className="w-10 h-4 px-1 text-[10px] text-center"
        value={localValue}
        onChange={(e) => {
          const newValue = e.target.value;
          if (newValue === "" || (!Number.isNaN(Number(newValue)) && Number(newValue) >= 0)) {
            setLocalValue(newValue);
          }
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default Speed;
