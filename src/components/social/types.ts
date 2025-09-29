// src/components/social/types.ts
export type ProviderKey = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'gmb' | 'pinterest' | 'threads' | 'tiktok';


export type SocialConnection = {
id: number;
customer_id: number;
provider_key: ProviderKey;
external_account_id: string;
external_account_name: string;
is_active: boolean;
meta?: Record<string, any> | null;
};


export type SocialMediaAsset = {
id: number;
storage_path: string;
mime: string;
width?: number | null;
height?: number | null;
duration_ms?: number | null;
};


export type SocialPostTarget = {
id: number;
post_id: number;
connection_id: number;
provider_key: ProviderKey;
status: 'queued'|'publishing'|'published'|'failed'|'skipped';
external_post_id?: string | null;
external_permalink?: string | null;
error_code?: string | null;
error_message?: string | null;
published_at?: string | null;
attempts: number;
last_attempt_at?: string | null;
};


export type SocialPost = {
id: number;
customer_id: number;
created_by: number;
title?: string | null;
body?: string | null;
link_url?: string | null;
scheduled_for?: string | null; // ISO
status: 'draft'|'queued'|'publishing'|'published'|'failed'|'canceled';
variants?: Record<string, any> | null; // per-network overrides
rules?: Record<string, any> | null;
media?: SocialMediaAsset[];
targets?: SocialPostTarget[];
created_at?: string;
updated_at?: string;
};