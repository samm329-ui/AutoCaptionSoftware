import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";

const Opacity = ({
  value,
  onChange
}: {
  value: number;
  onChange: (v: number) => void;
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="flex gap-1 items-center">
      <div className="text-[10px] text-muted-foreground w-12 shrink-0">Opacity</div>
      <Slider
        value={[localValue]}
        onValueChange={(e) => setLocalValue(e[0])}
        onValueCommit={() => onChange(localValue)}
        min={0}
        max={100}
        step={1}
        className="flex-1 h-1"
      />
      <Input
        max={100}
        className="w-10 h-4 px-1 text-[10px] text-center"
        type="number"
        onChange={(e) => {
          const newValue = Number(e.target.value);
          if (newValue >= 0 && newValue <= 100) {
            setLocalValue(newValue);
            onChange(newValue);
          }
        }}
        value={localValue}
      />
    </div>
  );
};

export default Opacity;
