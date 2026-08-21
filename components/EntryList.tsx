import type { Entry } from "@/lib/types";
import LogEntryView from "./LogEntryView";

export default function EntryList({
  entries,
  emptyText,
  newestFirst = false,
}: {
  entries: Entry[];
  emptyText: string;
  newestFirst?: boolean;
}) {
  if (!entries.length) return <div className="log-empty">{emptyText}</div>;
  const indexed = entries.map((entry, i) => ({ entry, i }));
  if (newestFirst) indexed.reverse();
  return (
    <>
      {indexed.map(({ entry, i }) => (
        <LogEntryView key={i} entry={entry} />
      ))}
    </>
  );
}
