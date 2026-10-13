"use client";
import { TicketsList } from "@/components/admin/TicketsList";

export default function SubadminLostTicketsPage() {
  return (
    <TicketsList
      filter="LOST"
      title="Lost Tickets"
      description="Tickets with at least one lost leg — stake retained by the system."
    />
  );
}
