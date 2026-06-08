import { useState, useMemo } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Message } from "@/lib/chat-types";

interface Props {
  messages: Message[];
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ChatSearch({ messages, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return messages.reduce<number[]>((acc, m, i) => {
      if (m.message_content.toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [query, messages]);

  function go(dir: 1 | -1) {
    if (!matches.length) return;
    const next = (cursor + dir + matches.length) % matches.length;
    setCursor(next);
    onNavigate(matches[next]);
  }

  return (
    <div className="flex items-center gap-2 bg-muted px-3 py-2 border-b border-border">
      <Input
        autoFocus
        value={query}
        onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
        placeholder="Search messages..."
        className="h-8 text-sm flex-1"
        aria-label="Search within conversation"
      />
      {matches.length > 0 && (
        <span className="text-xs text-muted-foreground shrink-0">{cursor + 1}/{matches.length}</span>
      )}
      {query && matches.length === 0 && (
        <span className="text-xs text-muted-foreground shrink-0">No results</span>
      )}
      <Button variant="ghost" size="icon" className="size-7" onClick={() => go(-1)} disabled={matches.length === 0} aria-label="Previous match">
        <ChevronUp className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7" onClick={() => go(1)} disabled={matches.length === 0} aria-label="Next match">
        <ChevronDown className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7" onClick={onClose} aria-label="Close search">
        <X className="size-4" />
      </Button>
    </div>
  );
}
