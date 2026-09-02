import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Send, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageList } from "@/components/chat-message-list";
import { ChatPiiWarningModal } from "@/components/chat-pii-warning";
import { scanForPii } from "@/lib/chat-privacy";
import type { Message } from "@/lib/chat-types";
import {
  closeCaseThread,
  getCaseThread,
  markCaseThreadRead,
  sendCaseMessage,
} from "@/lib/admin/case-chat.functions";

const MAX_CHARS = 500;

const EMPTY_STATE: Record<string, string> = {
  not_assigned: "Assign this report to an official to start a case thread.",
  no_account: "This report was submitted anonymously without an account, so chat is unavailable.",
  missing_report: "This report could not be found.",
};

export function CaseChatPanel({ reportId }: { reportId: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [pii, setPii] = useState<{ text: string; detected: string } | null>(null);
  const key = ["admin", "case-chat", reportId];

  const thread = useQuery({
    queryKey: key,
    queryFn: () => getCaseThread({ data: { reportId } }),
    refetchInterval: 10_000,
  });

  const markRead = useMutation({
    mutationFn: () => markCaseThreadRead({ data: { reportId } }),
  });

  useEffect(() => {
    if (thread.data?.state === "ready") markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.data?.messages.length, thread.data?.state]);

  const send = useMutation({
    mutationFn: (content: string) => sendCaseMessage({ data: { reportId, content } }),
    onSuccess: async () => {
      setText("");
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const close = useMutation({
    mutationFn: () => closeCaseThread({ data: { reportId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  function submit() {
    const content = text.trim();
    if (!content) return;
    const scan = scanForPii(content);
    if (scan.hasPii) {
      setPii({ text: content, detected: scan.detectedText });
      return;
    }
    send.mutate(content);
  }

  const state = thread.data?.state;
  const meta = thread.data?.thread ?? null;
  const messages = (thread.data?.messages ?? []) as unknown as Message[];

  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Reporter conversation</h2>
          <p className="text-xs text-muted-foreground">
            {meta
              ? `Anonymous reporter ${meta.reporter_anon_code} · identity is never revealed`
              : "Case-scoped and anonymous"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {meta ? (
            <Badge variant="outline" className="text-[10px]">
              {meta.status.replace(/_/g, " ")}
            </Badge>
          ) : null}
          {meta && !meta.readOnly ? (
            <Button
              variant="outline"
              size="sm"
              disabled={close.isPending}
              onClick={() => close.mutate()}
            >
              <Lock className="mr-2 size-4" aria-hidden="true" />
              Close thread
            </Button>
          ) : null}
        </div>
      </div>

      {state && state !== "ready" ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">{EMPTY_STATE[state]}</p>
      ) : (
        <>
          <div className="max-h-96 overflow-y-auto bg-muted/30">
            {messages.length ? (
              <MessageList messages={messages} />
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No messages yet. Introduce yourself and request only case-relevant detail.
              </p>
            )}
          </div>

          {meta?.readOnly ? (
            <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
              This conversation is closed. History is preserved for the case record.
            </p>
          ) : (
            <div className="border-t border-border p-3">
              {meta && !meta.is_mine ? (
                <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                  You are not the assigned official — messaging is permitted for admins only and is
                  audited.
                </p>
              ) : null}
              <label htmlFor="case-chat-input" className="sr-only">
                Message the anonymous reporter
              </label>
              <Textarea
                id="case-chat-input"
                value={text}
                maxLength={MAX_CHARS}
                rows={3}
                placeholder="Ask only for case-relevant details. Never request identifying information."
                onChange={(e) => setText(e.target.value)}
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {text.length}/{MAX_CHARS}
                </span>
                <Button disabled={!text.trim() || send.isPending} onClick={submit}>
                  <Send className="mr-2 size-4" aria-hidden="true" />
                  {send.isPending ? "Sending…" : "Send"}
                </Button>
              </div>
              {send.error ? (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {send.error.message}
                </p>
              ) : null}
            </div>
          )}
        </>
      )}

      {pii ? (
        <ChatPiiWarningModal
          open
          detectedText={pii.detected}
          onEdit={() => setPii(null)}
          onCancel={() => setPii(null)}
          onSendAnyway={() => {
            send.mutate(pii.text);
            setPii(null);
          }}
        />
      ) : null}
    </Card>
  );
}
