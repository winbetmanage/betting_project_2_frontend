"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Smartphone, Search, Globe, MapPin } from "lucide-react";

type DeviceRow = {
  id: string;
  deviceName: string | null;
  deviceType: string;
  os: string | null;
  browser: string | null;
  ipAddress: string;
  location: string | null;
  isTrusted: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  user: { id: string; email: string; name: string | null; role: string } | null;
  _count: { refreshTokens: number };
};

const typeBadge: Record<string, string> = {
  DESKTOP: "bg-primary/15 text-primary border-primary/20",
  MOBILE: "bg-secondary/15 text-secondary border-secondary/20",
  TABLET: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  UNKNOWN: "bg-muted text-muted-foreground border-border",
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    setLoading(true);
    api
      .get<{ data: DeviceRow[] }>("/users/devices", t)
      .then((r) => setDevices(r.data ?? []))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load devices"))
      .finally(() => setLoading(false));
  }, []);

  const visible = devices.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${d.user?.name ?? ""} ${d.user?.email ?? ""} ${d.deviceName ?? ""} ${d.ipAddress} ${d.location ?? ""}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Smartphone className="size-3.5" /> Devices Info
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Smartphone className="size-6 text-primary" /> User Devices
        </h1>
        <p className="text-sm text-muted-foreground">
          Every device users log in from — IP address, approximate location (city, country) and last seen time.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-5 text-primary" /> Sessions &amp; Devices
            <Badge variant="secondary" className="ml-2 bg-secondary/15 text-secondary border-secondary/20">
              {visible.length} device{visible.length === 1 ? "" : "s"}
            </Badge>
          </CardTitle>
          <CardDescription>Locations are resolved from IP geolocation (best effort — local IPs show no location).</CardDescription>
          <div className="mt-3 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search user, device, IP, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center py-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/custom/infinite-spinner.svg" alt="Loading" className="size-10" />
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <Smartphone className="mx-auto size-10 text-muted-foreground/30" />
              <p className="mt-3 text-sm font-medium">No devices recorded yet</p>
              <p className="text-xs text-muted-foreground">Devices appear here after users log in</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="admin-cards">
                <TableHeader className="bg-primary">
                  <TableRow className="hover:bg-primary border-primary">
                    <TableHead className="text-white text-xs tracking-widest">USER</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">DEVICE</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">TYPE</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">IP ADDRESS</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">LOCATION</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">LAST SEEN</TableHead>
                    <TableHead className="text-white text-xs tracking-widest">SESSIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((d) => (
                    <TableRow key={d.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div className="text-sm font-medium truncate max-w-[180px]">{d.user?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">{d.user?.email ?? "Unknown user"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm truncate max-w-[160px]">{d.deviceName ?? "Unknown device"}</div>
                        <div className="text-xs text-muted-foreground">{d.os ?? "—"} · {d.browser ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`border ${typeBadge[d.deviceType] ?? typeBadge.UNKNOWN}`}>{d.deviceType}</Badge>
                        {d.isTrusted && (
                          <Badge variant="outline" className="ml-1 border-green-500/20 bg-green-500/10 text-green-600">Trusted</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{d.ipAddress}</TableCell>
                      <TableCell>
                        {d.location ? (
                          <span className="flex items-center gap-1 text-sm">
                            <MapPin className="size-3.5 text-primary" /> {d.location}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(d.lastSeenAt).toLocaleString()}
                        <div className="text-[10px] text-muted-foreground">
                          first: {new Date(d.firstSeenAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{d._count.refreshTokens}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
