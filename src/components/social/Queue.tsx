// src/components/social/Queue.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { SocialAPI } from './api/social';
import type { SocialPost } from './types';


export default function Queue() {
const [items, setItems] = React.useState<SocialPost[]>([]);
const [status, setStatus] = React.useState<string>('queued');
const [q, setQ] = React.useState('');


async function load() {
const r = await SocialAPI.listPosts({ status, q });
setItems(r.data || []);
}


React.useEffect(() => { load(); }, [status]);


return (
<div className="p-6 space-y-4">
<div className="flex items-center justify-between">
<h1 className="text-2xl font-semibold">Posts</h1>
<div className="flex items-center gap-2">
<select value={status} onChange={e => setStatus(e.target.value)} className="p-2 rounded-xl border">
<option value="">All</option>
<option value="draft">Draft</option>
<option value="queued">Queued</option>
<option value="publishing">Publishing</option>
<option value="published">Published</option>
<option value="failed">Failed</option>
</select>
<input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="p-2 rounded-xl border"/>
<button onClick={load} className="px-3 py-2 rounded-xl shadow text-sm">Filter</button>
</div>
</div>


<div className="rounded-2xl border overflow-hidden">
<table className="w-full text-sm">
<thead className="bg-gray-50">
<tr>
<th className="text-left p-3">ID</th>
<th className="text-left p-3">Body</th>
<th className="text-left p-3">Scheduled</th>
<th className="text-left p-3">Status</th>
<th className="p-3"></th>
</tr>
</thead>
<tbody>
{items.map(p => (
<tr key={p.id} className="border-t">
<td className="p-3">{p.id}</td>
<td className="p-3 max-w-[420px] truncate">{p.body}</td>
<td className="p-3">{p.scheduled_for ? new Date(p.scheduled_for).toLocaleString() : '-'}</td>
<td className="p-3 capitalize">{p.status}</td>
<td className="p-3 text-right"><Link to={`/customer/social/posts/${p.id}`} className="text-blue-600">Open</Link></td>
</tr>
))}
{!items.length && (
<tr><td className="p-4 text-center text-gray-500" colSpan={5}>No posts</td></tr>
)}
</tbody>
</table>
</div>
</div>
);
}