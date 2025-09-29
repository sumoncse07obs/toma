// src/components/social/api/social.ts
import { toast } from 'react-toastify';


const TOKEN_KEY = 'toma_token';
const API_HOST = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/,'');
const API = `${API_HOST}/api`;


function norm(path: string) {
if (!path.startsWith('/')) path = `/${path}`;
return `${API}${path}`.replace(/([^:]\/)\/+/, '$1');
}


async function http<T>(path: string, init?: RequestInit): Promise<T> {
const url = norm(path);
const token = localStorage.getItem(TOKEN_KEY);
const res = await fetch(url, {
headers: {
'Content-Type': 'application/json',
Accept: 'application/json',
...(token ? { Authorization: `Bearer ${token}` } : {}),
...(init?.headers || {}),
},
credentials: 'include',
...init,
});
if (!res.ok) {
const errText = await res.text();
let msg = 'Request failed';
try { msg = JSON.parse(errText)?.message || errText; } catch {}
toast.error(msg);
throw new Error(msg);
}
return res.json();
}


export const SocialAPI = {
// OAuth
oauthRedirect(provider: string) {
window.location.href = norm(`/oauth/${provider}/redirect`);
},


// Connections
async listConnections() {
const r = await http<{data: any[]}>('/social/connections');
return r.data;
},
async disconnect(id: number) {
return http(`/social/connections/${id}`, { method: 'DELETE' });
},


// Posts
async listPosts(params: {status?: string, q?: string, page?: number} = {}) {
const query = new URLSearchParams(Object.entries(params).filter(([,v]) => v!=null && v!==''));
const r = await http<{data: any[]; meta?: any}>(`/social/posts?${query.toString()}`);
return r;
},
async createPost(payload: any) {
const r = await http<{data: any}>('/social/posts', { method: 'POST', body: JSON.stringify(payload) });
return r.data;
},
async getPost(id: number) {
const r = await http<{data: any}>(`/social/posts/${id}`);
return r.data;
},
async queuePost(id: number) {
return http(`/social/posts/${id}/queue`, { method: 'POST' });
},
async retryTarget(targetId: number) {
return http(`/social/targets/${targetId}/retry`, { method: 'POST' });
}
};