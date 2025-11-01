// src/components/customer/lib/customer.tsx
import { apiCall } from "@/auth";

export type CustomerMe = {
  customer_number?: string | null;
  customer?: {
    customer_number?: string | null;
    business_name?: string | null;
  };
};

// Keep the same name, same behavior, just include businessName too
export async function getCustomerNumber(): Promise<string | undefined> {
  try {
    const res = await apiCall("/customers/me");
    const data: CustomerMe = res?.data ?? res;
    const number =
      data?.customer_number ??
      data?.customer?.customer_number ??
      undefined;

    // 💡 Store business_name in localStorage for global reuse
    const businessName = data?.customer?.business_name;
    if (businessName) {
      localStorage.setItem("business_name", businessName);
    }

    return number;
  } catch {
    return undefined;
  }
}
