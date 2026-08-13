"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Home, LogOut, Settings } from "@/components/icons";
import { api, auth, type SessionUser } from "@/lib/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { primaryConsole } from "@/components/nav-links";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Avatar({ user, size }: { user: SessionUser; size: number }) {
  return user.avatar ? (
    // eslint-disable-next-line @next/next/no-img-element -- data-URL avatar
    <img
      src={user.avatar}
      alt=""
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-[#60a5fa] text-base font-bold text-[#03182b]"
    >
      {initials(user.name)}
    </span>
  );
}

// The signed-in account block shared by the dashboard masthead and the public
// nav. The dropdown follows the iGrant.io account menu: a centred identity
// header, the Dashboard row, then the account actions in small caps.
export function AccountMenu({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    auth.signOut();
    router.push("/");
  }

  const actionLabel = "flex-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1 text-left">
        <span className="hidden text-right sm:block">
          <span className="flex items-center justify-end gap-2 text-[16px] font-bold leading-tight">
            {user.name}
            <span className="inline-flex h-[18px] items-center rounded-full bg-[#aed581] px-1.5 text-[10px] font-bold capitalize text-black">
              {user.role}
            </span>
          </span>
          <span className="block text-[12px] leading-tight text-muted-foreground">
            Logged in as: {user.email}
          </span>
        </span>
        <Avatar user={user} size={50} />
        <ChevronDown className="size-6 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px] p-0">
        {/* Identity header, centred as on the reference menu */}
        <div className="grid justify-items-center px-4 pb-4 pt-5 text-center">
          <Avatar user={user} size={56} />
          <span className="mt-2 text-[15px] font-semibold text-ink">{user.name}</span>
          <span className="mt-0.5 text-xs text-muted-foreground">{user.email}</span>
        </div>
        <DropdownMenuSeparator className="my-0" />

        {/* The user's console */}
        <div className="p-1.5">
          <DropdownMenuItem
            render={<Link href={primaryConsole(user)} />}
            className="cursor-pointer gap-3 px-2.5 py-2.5"
          >
            <Home className="size-5 shrink-0 text-ink" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
              Dashboard
            </span>
          </DropdownMenuItem>
        </div>
        <DropdownMenuSeparator className="my-0" />

        {/* Account actions, small caps as on the reference */}
        <div className="p-1.5">
          <DropdownMenuItem
            render={<Link href="/settings" />}
            className="cursor-pointer gap-3 px-2.5 py-2.5"
          >
            <Settings className="size-5 shrink-0 text-ink" aria-hidden="true" />
            <span className={actionLabel}>Manage User</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut} className="cursor-pointer gap-3 px-2.5 py-2.5">
            <LogOut className="size-5 shrink-0 text-ink" aria-hidden="true" />
            <span className={actionLabel}>Signout</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
