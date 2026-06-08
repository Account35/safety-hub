import { ArrowLeft, Info, Bell, MoreVertical, Search, Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Conversation } from "@/lib/chat-types";

interface Props {
  conversation: Conversation;
  connected: boolean;
  onInfoOpen: () => void;
  onSearchToggle: () => void;
  onCloseConversation: () => void;
  onExport: () => void;
}

export function ChatHeader({
  conversation,
  connected,
  onInfoOpen,
  onSearchToggle,
  onCloseConversation,
  onExport,
}: Props) {
  const navigate = useNavigate();
  const isClosed = conversation.status === "closed" || conversation.status === "archived";

  return (
    <div className="sticky top-0 z-30 flex items-center gap-2 bg-background border-b border-border px-3 py-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate({ to: "/chats" })}
        aria-label="Back to conversations"
        tabIndex={0}
      >
        <ArrowLeft className="size-5" />
      </Button>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {conversation.case_photo ? (
          <img
            src={conversation.case_photo}
            alt=""
            className="size-9 rounded-full object-cover shrink-0"
            aria-hidden="true"
          />
        ) : (
          <div className="size-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
            {conversation.case_name?.[0] ?? "?"}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{conversation.case_name ?? "Case"}</p>
          <p className="text-[10px] text-muted-foreground capitalize">
            {conversation.case_type === "wanted" ? "Wanted Person" : "Missing Person"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex items-center gap-1 text-[10px] px-1">
              <Lock className="size-3 text-muted-foreground" aria-hidden="true" />
            </span>
          </TooltipTrigger>
          <TooltipContent>All messages are encrypted</TooltipContent>
        </Tooltip>

        <span
          className={`flex items-center gap-1 text-[10px] ${connected ? "text-green-600" : "text-amber-500"}`}
          aria-live="polite"
          aria-label={connected ? "Connected" : "Reconnecting"}
        >
          <span className={`size-1.5 rounded-full ${connected ? "bg-green-500" : "bg-amber-400"}`} aria-hidden="true" />
          {connected ? "Connected" : "Reconnecting..."}
        </span>

        {!isClosed && (
          <span className="flex items-center gap-1 text-[10px] text-green-600">
            <span className="size-1.5 rounded-full bg-green-500" aria-hidden="true" />
            Active
          </span>
        )}
        {isClosed && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-muted-foreground" aria-hidden="true" />
            Closed
          </span>
        )}

        <Button variant="ghost" size="icon" onClick={onInfoOpen} aria-label="Privacy information" tabIndex={0}>
          <Info className="size-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More options" tabIndex={0}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSearchToggle}>
              <Search className="size-4 mr-2" /> Search Messages
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              Save Conversation
            </DropdownMenuItem>
            {!isClosed && (
              <DropdownMenuItem onClick={onCloseConversation} className="text-destructive">
                Close Conversation
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
