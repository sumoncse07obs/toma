// src/components/social/validators.ts
export function limitText(input: string, max: number) {
const text = input || '';
return {
ok: text.length <= max,
used: text.length,
max,
remaining: Math.max(0, max - text.length)
};
}


export function suggestHashtags(base: string) {
const words = (base || '').split(/\s+/).filter(Boolean);
const tags = words
.filter(w => /[a-zA-Z]/.test(w))
.slice(0, 6)
.map(w => '#' + w.replace(/[^a-z0-9]/gi,'').toLowerCase());
return Array.from(new Set(tags));
}