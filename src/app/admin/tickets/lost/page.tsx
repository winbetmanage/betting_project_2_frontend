"use client";
import { TicketsList } from "@/components/admin/TicketsList";

export default function LostTicketsPage() {
  return (
    <TicketsList
      filter="LOST"
      title="Lost Tickets"
      description="Tickets with at least one lost leg — ticket counts as lost immediately."
    />
  );
}
