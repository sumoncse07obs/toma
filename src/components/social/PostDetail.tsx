// src/components/social/PostDetail.tsx
import { SocialAPI } from './api/social';
import type { SocialPost, SocialPostTarget } from './types';


export default function PostDetail() {
const { id } = useParams();
const [post, setPost] = React.useState<SocialPost | null>(null);


React.useEffect(() => {
if (!id) return;
SocialAPI.getPost(Number(id)).then(setPost);
}, [id]);


async function retry(t: SocialPostTarget) {
await SocialAPI.retryTarget(t.id);
const fresh = await SocialAPI.getPost(Number(id));
setPost(fresh);
}


if (!post) return <div className="p-6">Loading...</div>;


return (
<div className="p-6 space-y-6">
<header className="flex items-center justify-between">
<h1 className="text-2xl font-semibold">Post #{post.id}</h1>
<div className="text-sm text-gray-500">Status: <span className="capitalize">{post.status}</span></div>
</header>


<div className="grid md:grid-cols-3 gap-6">
<div className="md:col-span-2 space-y-4">
<div className="p-4 rounded-2xl border">
<div className="font-medium mb-2">Caption</div>
<div className="whitespace-pre-wrap text-sm">{post.body || '(no caption)'}</div>
{post.link_url && (
<a href={post.link_url} target="_blank" className="text-blue-600 text-sm mt-2 inline-block">{post.link_url}</a>
)}
</div>


<div className="p-4 rounded-2xl border">
<div className="font-medium mb-2">Media</div>
<div className="flex gap-3 flex-wrap">
{post.media?.map(m => (
<a key={m.id} href={m.storage_path} target="_blank" className="block w-40 h-40 rounded-xl border overflow-hidden">
<img src={m.storage_path} className="w-full h-full object-cover" />
</a>
)) || <div className="text-sm text-gray-500">No media</div>}
</div>
</div>
</div>


<div className="space-y-4">
<div className="p-4 rounded-2xl border">
<div className="font-medium mb-3">Targets</div>
<div className="space-y-3">
{post.targets?.map(t => (
<div key={t.id} className="p-3 rounded-xl border">
<div className="flex items-center justify-between">
<div className="text-sm capitalize">{t.provider_key}</div>
<span className={`text-xs px-2 py-1 rounded-full ${t.status==='failed'?'bg-red-100 text-red-700': t.status==='published'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}`}>{t.status}</span>
</div>
{t.external_permalink && (
<a className="text-blue-600 text-sm" href={t.external_permalink} target="_blank">Permalink</a>
)}
{t.error_message && (
<div className="text-xs text-red-600 mt-1">{t.error_message}</div>
)}
{t.status==='failed' && (
<button onClick={() => retry(t)} className="mt-2 w-full py-2 rounded-xl shadow text-sm">Retry</button>
)}
</div>
)) || <div className="text-sm text-gray-500">No targets</div>}
</div>
</div>
</div>
</div>
</div>
);
}