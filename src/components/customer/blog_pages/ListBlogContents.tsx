// src/components/customer/ListBlogContents.tsx
import React from "react"
import { currentUser, isAuthed, refreshUser, type User } from "@/components/auth"
import { Link } from "react-router-dom" // Add this import for routing

type ContentGeneration = {
  id: number
  customer_id: number
  url: string
  title: string | null
  status: "idle" | "queued" | "processing" | "completed" | "failed"
  last_run_at: string | null
  created_at?: string
  updated_at?: string
}

type Paginated<T> = {
  data: T[]
  total: number
  page: number
  per_page: number
}

type Props = {
  customerId?: number  // Make it optional
  perPage?: number
}

/* ========= API base (use your existing auth system) =========*/
const API_BASE_URL = `${import.meta.env.VITE_API_BASE}/api`
const TOKEN_KEY = "toma_token"

function qs(params: Record<string, any>) {
  const s = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") s.append(k, String(v))
  })
  const str = s.toString()
  return str ? `?${str}` : ""
}

function fmt(ts: string | null) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString()
}

function cls(...xs: Array<string | null | false | undefined>) {
  return xs.filter(Boolean).join(" ")
}

/** API helper using your existing auth system */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!path.startsWith("/")) path = `/${path}`
  const url = `${API_BASE_URL}${path}`.replace(/([^:]\/)\/+/g, "$1")
  const token = localStorage.getItem(TOKEN_KEY)
  const hasBody = !!init?.body

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
      ...init,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
    }

    const ct = res.headers.get("content-type") || ""
    
    if (!ct.includes("application/json")) {
      return undefined as T
    }
    
    const data = await res.json()
    return data as T
  } catch (error) {
    throw error
  }
}

export default function ListBlogContents({ customerId, perPage = 10 }: Props) {
  // Get user from your existing auth system
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Use the current user's ID as customer ID
  const validCustomerId = customerId || user?.id || 1
  
  const [q, setQ] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [rows, setRows] = React.useState<ContentGeneration[]>([])
  const [total, setTotal] = React.useState(0)

  // Get current user on mount
  React.useEffect(() => {
    const currentUserData = currentUser()
    if (currentUserData) {
      setUser(currentUserData)
    } else if (isAuthed()) {
      // If we have a token but no user data, refresh it
      refreshUser().then(userData => {
        if (userData) {
          setUser(userData)
        }
      })
    }
  }, [])

  const load = React.useCallback(async () => {
    // Use the current user's ID as customer_id
    const customerIdToUse = validCustomerId

    try {
      setLoading(true)
      setError(null)
      
      const params = {
        customer_id: customerIdToUse,
        page,
        per_page: perPage,
        q,
      }
      
      const queryString = qs(params)
      const fullUrl = `/content-generations${queryString}`
      
      const res = await api<any>(fullUrl, { method: "GET" })
      
      // Handle different possible response formats
      if (res && typeof res === 'object') {
        if (Array.isArray(res)) {
          // If API returns a direct array
          setRows(res)
          setTotal(res.length)
        } else if (res.data && Array.isArray(res.data)) {
          // If API returns paginated format { data: [], total: number }
          setRows(res.data)
          setTotal(res.total || res.data.length)
        } else if (res.items && Array.isArray(res.items)) {
          // Alternative pagination format { items: [], total: number }
          setRows(res.items)
          setTotal(res.total || res.items.length)
        } else {
          setError(`Unexpected API response format. Keys: ${Object.keys(res).join(', ')}`)
          setRows([])
          setTotal(0)
        }
      } else {
        setError("API returned empty or invalid response")
        setRows([])
        setTotal(0)
      }
    } catch (e: any) {
      setError(e.message || "Failed to load")
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [validCustomerId, page, perPage, q])

  React.useEffect(() => {
    if (user) {
      load()
    }
  }, [load, user])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Blogs Automation</h1>
        <div className="flex gap-2">
          <Link
            to="/customer/blog/new"
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700 transition-colors"
          >
            New Automation
          </Link>
          <button
            onClick={() => load()}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Auth status info */}
      {!isAuthed() && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <p className="text-sm text-yellow-800">
            You need to be logged in to view content generations. Please login to your account first.
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <input
          value={q}
          onChange={e => {
            setPage(1)
            setQ(e.target.value)
          }}
          placeholder="Search URL or title…"
          className="w-full md:w-80 rounded-lg border px-3 py-2 outline-none focus:ring"
        />
        <div className="text-sm text-gray-500">
          {loading ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-[800px] w-full text-left">
          <thead className="bg-gray-50 text-sm">
            <tr>
              <th className="px-3 py-2 font-medium">URL</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Last Run</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {r.url}
                  </a>
                </td>

                <td className="px-3 py-2">
                  <span
                    className="block max-w-[28rem] truncate"
                    title={r.title || ""}
                  >
                    {r.title || <span className="text-gray-400 italic">—</span>}
                  </span>
                </td>

                <td className="px-3 py-2">
                  <span
                    className={cls(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      r.status === "completed" && "bg-green-100 text-green-700",
                      r.status === "processing" && "bg-amber-100 text-amber-700",
                      r.status === "queued" && "bg-blue-100 text-blue-700",
                      r.status === "failed" && "bg-red-100 text-red-700",
                      r.status === "idle" && "bg-gray-100 text-gray-600"
                    )}
                  >
                    {r.status}
                  </span>
                </td>

                <td className="px-3 py-2">{fmt(r.last_run_at)}</td>

                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      to={`/customer/blog/view/${r.id}`}
                      className="rounded-md border px-2 py-1 hover:bg-gray-50 transition-colors text-blue-600 hover:text-blue-700"
                    >
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  No records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Prev
          </button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}