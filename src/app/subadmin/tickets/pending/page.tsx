"use client";
import { TicketsList } from "@/components/admin/TicketsList";

export default function SubadminPendingTicketsPage() {
  return (
    <TicketsList
      filter="PENDING"
      title="Pending Tickets"
      description="Tickets still waiting on leg results — no winner and no loser yet."
    />
  );
}
