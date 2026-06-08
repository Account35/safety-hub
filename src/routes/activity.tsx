import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/activity")({
  beforeLoad: () => {
    throw redirect({ to: "/chats" });
  },
  component: () => null,
});