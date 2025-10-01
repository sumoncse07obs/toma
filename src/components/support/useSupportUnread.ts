import { useEffect, useState } from "react";
import { SupportAPI } from "@/components/support/api";

export function useSupportUnread(pollMs = 30000) {
  const [counts, setCounts] = useState<{tickets: number; messages: number}>({tickets: 0, messages: 0});

  async function load() {
    try {
      const res = await SupportAPI.unreadSummary();
      setCounts({ tickets: res.total_unread_tickets, messages: res.total_unread_messages });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return counts;
}
