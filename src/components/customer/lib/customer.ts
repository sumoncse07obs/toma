// src/components/customer/lib/customer.tsx
import { apiCall } from "@/auth"; // reuse your single API helper

export type CustomerMe = {
  customer_number?: string | null;
  // add more fields here if you need later
};

// Safe call that returns undefined for non-customers (call-site will guard)
export async function getCustomerNumber(): Promise<string | undefined> {
  try {
    // Your API may return { data: {...} } or the object directly
    const res = await apiCall("/customers/me");
    const data: CustomerMe = (res?.data ?? res) || {};
    return (res?.data?.customer_number ?? data?.customer_number) || undefined;
  } catch {
    return undefined;
  }
}
