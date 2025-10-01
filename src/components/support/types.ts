export type SupportAttachment = {
  id?: number;
  name: string;
  mime?: string | null;
  url: string;
};

export type SupportMessage = {
  id: number;
  user_id: number | null;
  is_staff: boolean;
  message: string;
  created_at: string;
  attachments?: SupportAttachment[];
};

export type SupportTicket = {
  id: number;
  customer_id: number;
  user_id: number;
  subject: string;
  priority: 'low'|'normal'|'high';
  status: 'open'|'pending'|'closed';
  last_activity_at: string | null;
  created_at: string;
  messages?: SupportMessage[];
  unread_count?: number;
};
