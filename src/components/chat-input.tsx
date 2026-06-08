import { useRef, useState, useEffect } from "react";
import { Send, Paperclip, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { scanForPii, isContactRequest } from "@/lib/chat-privacy";
import { ChatPiiWarningModal } from "@/components/chat-pii-warning";
import { cn } from "@/lib/utils";
import { stripExifToDataUrl } from "@/lib/reports/exif-strip";

const MAX_CHARS = 500;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 5 * 60 * 1000;

interface Props {
  onSend: (content: string, attachment?: string) => void;
  disabled?: boolean;
  lastOfficerMessage?: string;
  messageCount: number;
}

export function ChatInput({ onSend, disabled, lastOfficerMessage, messageCount }: Props) {
  const [text, setText] = useState("");
  const [piiWarning, setPiiWarning] = useState<{ text: string; detected: string } | null>(null);
  const [rateTs, setRateTs] = useState<number[]>([]);
  const [rateLimitMsg, setRateLimitMsg] = useState("");
  const [showReminder, setShowReminder] = useState(false);
  const [softPiiNote, setSoftPiiNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // periodic privacy reminder every 10 messages
  useEffect(() => {
    if (messageCount > 0 && messageCount % 10 === 0) setShowReminder(true);
  }, [messageCount]);

  function getRemainingRate(): number {
    const now = Date.now();
    const recent = rateTs.filter((t) => now - t < RATE_WINDOW_MS);
    return RATE_LIMIT - recent.length;
  }

  function attemptSend(content: string, attachment?: string) {
    const now = Date.now();
    const recent = rateTs.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_LIMIT) {
      const resetIn = Math.ceil((recent[0] + RATE_WINDOW_MS - now) / 1000);
      setRateLimitMsg(`Please wait ${resetIn}s before sending more messages.`);
      return;
    }
    setRateTs([...recent, now]);
    setRateLimitMsg("");
    onSend(content, attachment);
    setText("");
    setSoftPiiNote("");
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    const scan = scanForPii(trimmed);
    if (scan.hasPii) {
      const isContactCtx = lastOfficerMessage && isContactRequest(lastOfficerMessage);
      if (isContactCtx && (scan.type === "phone" || scan.type === "email")) {
        setSoftPiiNote("You are about to share contact information. This is only appropriate if you want SAPS to contact you directly. Your anonymity will be reduced.");
        attemptSend(trimmed);
        return;
      }
      setPiiWarning({ text: trimmed, detected: scan.detectedText });
      return;
    }
    attemptSend(trimmed);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return;
    try {
      const { dataUrl } = await stripExifToDataUrl(file, 1920, 0.7);
      attemptSend(text.trim() || "[Photo]", dataUrl);
    } catch {
      // silently ignore
    }
    e.target.value = "";
  }

  const remaining = MAX_CHARS - text.length;
  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-primary bg-background">
      {showReminder && (
        <div className="flex items-center gap-2 bg-primary text-primary-foreground text-xs px-3 py-2">
          <Shield className="size-3 shrink-0" aria-hidden="true" />
          <span>Remember: For your safety, avoid sharing your name, address, or phone number unless asked by the officer.</span>
          <button
            className="ml-auto shrink-0 opacity-70 hover:opacity-100"
            onClick={() => setShowReminder(false)}
            aria-label="Dismiss reminder"
          >
            ✕
          </button>
        </div>
      )}
      {softPiiNote && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-3 py-2">
          {softPiiNote}
        </div>
      )}
      {rateLimitMsg && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-3 py-2">
          {rateLimitMsg}
        </div>
      )}
      <div className="flex items-end gap-2 p-2">
        <button
          type="button"
          className="shrink-0 p-2 text-muted-foreground hover:text-primary"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach photo"
          tabIndex={0}
        >
          <Paperclip className="size-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
          aria-hidden="true"
        />
        <div className="flex-1 relative">
          <Textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && e.currentTarget === e.target) {
                // only send when send button has focus, not textarea
              }
            }}
            placeholder="Type your message to SAPS Officer..."
            className="resize-none min-h-[40px] max-h-[104px] pr-2 text-sm"
            rows={1}
            disabled={disabled}
            aria-label="Message input"
          />
          {remaining < 100 && (
            <span
              className={cn(
                "absolute bottom-1 right-2 text-[10px]",
                remaining < 20 ? "text-destructive" : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {remaining} remaining
            </span>
          )}
        </div>
        <Button
          size="icon"
          className={cn(
            "shrink-0 rounded-full size-10",
            canSend ? "bg-accent text-accent-foreground" : "opacity-40",
          )}
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        >
          <Send className="size-4" />
        </Button>
      </div>

      {piiWarning && (
        <ChatPiiWarningModal
          open
          detectedText={piiWarning.detected}
          onEdit={() => {
            setPiiWarning(null);
            setTimeout(() => textRef.current?.focus(), 50);
          }}
          onSendAnyway={() => {
            const t = piiWarning.text;
            setPiiWarning(null);
            attemptSend(t);
          }}
          onCancel={() => setPiiWarning(null)}
        />
      )}
    </div>
  );
}
