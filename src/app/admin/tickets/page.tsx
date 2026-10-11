"use client";
import { TicketsList } from "@/components/admin/TicketsList";

export default function AllTicketsPage() {
  return (
    <TicketsList
      filter="ALL"
      title="All Tickets"
      description="Every ticket — user, picks, derived ticket status and balance settlement."
    />
  );
}
