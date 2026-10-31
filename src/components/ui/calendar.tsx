"use client";
import * as React from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import "react-day-picker/style.css";

export type { DateRange };

export function RangeCalendar({ value, onChange, max }: { value: DateRange | undefined; onChange: (r: DateRange | undefined) => void; max?: Date }) {
  return (
    <div className="fidely-calendar" style={{ ["--rdp-accent-color" as string]: "var(--indigo)", ["--rdp-accent-background-color" as string]: "var(--indigo-soft)", ["--rdp-day-height" as string]: "36px", ["--rdp-day-width" as string]: "36px", ["--rdp-day_button-height" as string]: "34px", ["--rdp-day_button-width" as string]: "34px" }}>
      <DayPicker mode="range" locale={fr} selected={value} onSelect={onChange} disabled={max ? { after: max } : undefined} numberOfMonths={1} weekStartsOn={1} />
    </div>
  );
}
