import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { SupportAPI } from "./api";
import { currentUser } from "@/auth";

export default function NewSupportTicket() {
  const nav = useNavigate();
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<'low'|'normal'|'high'>('normal');
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<{name:string; mime?:string|null; url:string}[]>([]);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const me = await currentUser();
      const customerId = Number(localStorage.getItem("toma_customer_id")) || me?.customer?.id;
      if (!customerId) throw new Error("Missing customer id");

      const { ticket } = await SupportAPI.create({ customer_id: customerId, subject, priority, message, attachments });
      toast.success("Ticket created");
      nav(`/customer/support/${ticket.id}`);
    } catch (err:any) {
      toast.error(err.message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  }

  // NOTE: For now we expect you to upload files to Supabase/S3 elsewhere and paste URL.
  // Later we can add a direct uploader that returns a public URL.
  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-4">New Support Ticket</h1>
      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow border p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Subject</label>
          <input className="w-full border rounded-md px-3 py-2" value={subject} onChange={e=>setSubject(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select className="w-full border rounded-md px-3 py-2" value={priority} onChange={e=>setPriority(e.target.value as any)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Describe the issue</label>
          <textarea className="w-full border rounded-md px-3 py-2 min-h-[160px]" value={message} onChange={e=>setMessage(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Attachments (paste URLs)</div>
          {attachments.map((a, i)=>(
            <div key={i} className="flex gap-2">
              <input className="flex-1 border rounded-md px-2 py-1" value={a.name} onChange={e=>{
                const c=[...attachments]; c[i]={...c[i], name:e.target.value}; setAttachments(c);
              }} placeholder="File name" />
              <input className="flex-[2] border rounded-md px-2 py-1" value={a.url} onChange={e=>{
                const c=[...attachments]; c[i]={...c[i], url:e.target.value}; setAttachments(c);
              }} placeholder="https://..." />
              <button type="button" className="px-2 border rounded-md" onClick={()=>{
                setAttachments(attachments.filter((_,x)=>x!==i));
              }}>Remove</button>
            </div>
          ))}
          <button type="button" className="px-3 py-1 border rounded-md" onClick={()=>setAttachments([...attachments, {name:'attachment', url:''}])}>
            + Add Attachment
          </button>
        </div>

        <button disabled={loading} className="px-4 py-2 rounded-md bg-slate-900 text-white disabled:opacity-50">
          {loading ? 'Creating…' : 'Create Ticket'}
        </button>
      </form>
    </div>
  );
}
