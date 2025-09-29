import React from 'react';


const [body, setBody] = React.useState('');
const [link, setLink] = React.useState('');
const [scheduledFor, setScheduledFor] = React.useState<string>('');


const [perNetwork, setPerNetwork] = React.useState<Record<string, { body?: string }>>({});


React.useEffect(() => {
SocialAPI.listConnections().then(setConnections);
}, []);


const fb = limitText(perNetwork['facebook']?.body ?? body, 63206);
const li = limitText(perNetwork['linkedin']?.body ?? body, 3000);
const x = limitText(perNetwork['x']?.body ?? body, 280);


function toggle(id: number) {
setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
}


async function submit() {
if (!selected.length) { toast.warn('Choose at least one target account'); return; }
const payload: Partial<SocialPost> = {
body,
link_url: link || undefined,
scheduled_for: scheduledFor || undefined,
variants: perNetwork,
rules: { targets: selected },
};
const created = await SocialAPI.createPost(payload);
await SocialAPI.queuePost(created.id);
toast.success('Queued for publishing');
setBody(''); setLink(''); setScheduledFor(''); setPerNetwork({}); setSelected([]);
}


const tags = suggestHashtags(body);


return (
<div className="p-6 grid gap-6 lg:grid-cols-3">
<div className="lg:col-span-2 space-y-4">
<h1 className="text-2xl font-semibold">Composer</h1>
<textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your caption..." className="w-full h-40 p-3 rounded-2xl border" />
<div className="flex gap-3">
<input value={link} onChange={e => setLink(e.target.value)} placeholder="Optional link (https://)" className="flex-1 p-3 rounded-2xl border" />
<input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="p-3 rounded-2xl border" />
</div>
<div className="text-xs text-gray-500">Hashtag suggestions: {tags.join(' ')}</div>


<div className="grid md:grid-cols-3 gap-4 mt-4">
<div className="p-4 rounded-2xl border">
<div className="font-medium mb-2">Facebook</div>
<textarea value={perNetwork['facebook']?.body ?? ''} onChange={e => setPerNetwork(v => ({...v, facebook:{...v['facebook'], body:e.target.value}}))} className="w-full h-28 p-2 rounded-xl border" placeholder="Override caption (optional)" />
<div className={`text-xs mt-1 ${fb.ok ? 'text-gray-500':'text-red-600'}`}>{fb.used}/{fb.max}</div>
</div>
<div className="p-4 rounded-2xl border">
<div className="font-medium mb-2">LinkedIn</div>
<textarea value={perNetwork['linkedin']?.body ?? ''} onChange={e => setPerNetwork(v => ({...v, linkedin:{...v['linkedin'], body:e.target.value}}))} className="w-full h-28 p-2 rounded-xl border" placeholder="Override caption (optional)" />
<div className={`text-xs mt-1 ${li.ok ? 'text-gray-500':'text-red-600'}`}>{li.used}/{li.max}</div>
</div>
<div className="p-4 rounded-2xl border">
<div className="font-medium mb-2">X (Twitter)</div>
<textarea value={perNetwork['x']?.body ?? ''} onChange={e => setPerNetwork(v => ({...v, x:{...v['x'], body:e.target.value}}))} className="w-full h-28 p-2 rounded-xl border" placeholder="Override caption (optional)" />
<div className={`text-xs mt-1 ${x.ok ? 'text-gray-500':'text-red-600'}`}>{x.used}/{x.max}</div>
</div>
</div>
</div>


<div className="space-y-4">
<h2 className="text-xl font-semibold">Targets</h2>
<div className="rounded-2xl border divide-y">
{connections.map(c => (
<label key={c.id} className="flex items-center gap-3 p-3">
<input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
<div className="text-sm">
<div className="font-medium">{c.external_account_name}</div>
<div className="text-gray-500 capitalize">{c.provider_key}</div>
</div>
</label>
))}
{!connections.length && (
<div className="p-3 text-sm text-gray-500">No connected accounts yet</div>
)}
</div>
<button onClick={submit} className="w-full py-3 rounded-2xl shadow font-medium">Queue Post</button>
</div>
</div>
);
}