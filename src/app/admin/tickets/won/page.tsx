"use client";
import { TicketsList } from "@/components/admin/TicketsList";

export default function WonTicketsPage() {
  return (
    <TicketsList
      filter="WON"
      title="Won Tickets"
      description="Tickets where every leg won — fully settled winners."
    />
  );
}
