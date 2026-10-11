"use client";
import { TicketsList } from "@/components/admin/TicketsList";

export default function PendingTicketsPage() {
  return (
    <TicketsList
      filter="PENDING"
      title="Pending Tickets"
      description="No lost legs yet and games still remaining — awaiting results."
    />
  );
}
