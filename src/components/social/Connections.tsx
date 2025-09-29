// src/components/social/Connections.tsx
{ key: 'linkedin', label: 'LinkedIn' },
{ key: 'x', label: 'X (Twitter)' },
{ key: 'youtube', label: 'YouTube' },
{ key: 'gmb', label: 'Google Business' },
{ key: 'pinterest', label: 'Pinterest' },
{ key: 'threads', label: 'Threads' },
{ key: 'tiktok', label: 'TikTok' },
];


export default function Connections() {
const [rows, setRows] = React.useState<SocialConnection[]>([]);
const [loading, setLoading] = React.useState(false);


async function load() {
setLoading(true);
try { setRows(await SocialAPI.listConnections()); } finally { setLoading(false); }
}


React.useEffect(() => { load(); }, []);


return (
<div className="p-6 space-y-6">
<header className="flex items-center justify-between">
<h1 className="text-2xl font-semibold">Connected Accounts</h1>
<button onClick={load} className="px-3 py-2 rounded-xl shadow text-sm">Refresh</button>
</header>


<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
{PROVIDERS.map(p => (
<div key={p.key} className="p-4 rounded-2xl shadow border flex flex-col gap-3">
<div className="font-medium">{p.label}</div>
<button onClick={() => SocialAPI.oauthRedirect(p.key)} className="px-3 py-2 rounded-xl shadow text-sm">Connect</button>
</div>
))}
</div>


<h2 className="text-xl font-semibold">Your Connections</h2>
<div className="rounded-2xl border overflow-hidden">
<table className="w-full text-sm">
<thead className="bg-gray-50">
<tr>
<th className="text-left p-3">Provider</th>
<th className="text-left p-3">Account</th>
<th className="text-left p-3">Status</th>
<th className="p-3"></th>
</tr>
</thead>
<tbody>
{rows.map(r => (
<tr key={r.id} className="border-t">
<td className="p-3 capitalize">{r.provider_key}</td>
<td className="p-3">{r.external_account_name}</td>
<td className="p-3">{r.is_active ? 'Active' : 'Disabled'}</td>
<td className="p-3 text-right">
<button onClick={() => SocialAPI.disconnect(r.id).then(load)} className="text-red-600">Disconnect</button>
</td>
</tr>
))}
{!rows.length && !loading && (
<tr><td className="p-4 text-center text-gray-500" colSpan={4}>No connections yet</td></tr>
)}
</tbody>
</table>
</div>
</div>
);
}