"use client";
import { TicketsList } from "@/components/admin/TicketsList";

export default function SubadminWonTicketsPage() {
  return (
    <TicketsList
      filter="WON"
      title="Won Tickets"
      description="Tickets whose every leg won — payout figures shown as settled by the system."
    />
  );
}
