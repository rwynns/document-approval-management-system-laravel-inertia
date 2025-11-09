import { AppSidebar } from '@/components/app-sidebar';
import { EnhancedDocumentTable } from '@/components/enhanced-document-table';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Head } from '@inertiajs/react';
import { IconFileText, IconSettings, IconShield, IconUsers } from '@tabler/icons-react';
import { Clock, Database, Settings } from 'lucide-react';

export default function SuperAdminDashboard() {
    return (
        <>
            <Head title="Super Admin Dashboard" />
            <SidebarProvider>
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2 p-6">
                            <div className="space-y-8">
                                {/* Header Section */}
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-2">
                                        <h1 className="flex items-center gap-3 font-sans text-3xl font-bold tracking-tight text-foreground">
                                            <IconShield className="h-8 w-8 text-primary" />
                                            Super Admin Dashboard
                                        </h1>
                                        <p className="font-sans text-base text-muted-foreground">
                                            Kelola sistem secara menyeluruh dengan kontrol administrasi penuh.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge
                                            variant="outline"
                                            className="border-primary/30 bg-primary/10 font-sans text-sm font-medium text-primary"
                                        >
                                            Super Admin Access
                                        </Badge>
                                        <Button size="sm" className="hidden font-sans font-medium sm:flex">
                                            <IconSettings className="mr-2 h-4 w-4" />
                                            System Settings
                                        </Button>
                                    </div>
                                </div>

                                {/* Stats Cards */}
                                <div>
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                                        <Card className="border-border bg-card transition-shadow hover:shadow-md">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-2">
                                                        <p className="font-sans text-sm font-medium text-muted-foreground">Total Users</p>
                                                        <p className="font-sans text-3xl font-bold text-foreground">156</p>
                                                    </div>
                                                    <div className="rounded-full bg-primary/10 p-3">
                                                        <IconUsers className="h-6 w-6 text-primary" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-border bg-card transition-shadow hover:shadow-md">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-2">
                                                        <p className="font-sans text-sm font-medium text-muted-foreground">All Documents</p>
                                                        <p className="font-sans text-3xl font-bold text-foreground">1,245</p>
                                                    </div>
                                                    <div className="rounded-full bg-accent/20 p-3">
                                                        <IconFileText className="h-6 w-6 text-accent-foreground" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-border bg-card transition-shadow hover:shadow-md">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-2">
                                                        <p className="font-sans text-sm font-medium text-muted-foreground">Pending Reviews</p>
                                                        <p className="font-sans text-3xl font-bold text-foreground">34</p>
                                                    </div>
                                                    <div className="rounded-full bg-destructive/10 p-3">
                                                        <Clock className="h-6 w-6 text-destructive" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-border bg-card transition-shadow hover:shadow-md">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-2">
                                                        <p className="font-sans text-sm font-medium text-muted-foreground">System Health</p>
                                                        <p className="font-sans text-3xl font-bold text-foreground">98%</p>
                                                    </div>
                                                    <div className="rounded-full bg-primary/10 p-3">
                                                        <Settings className="h-6 w-6 text-primary" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-border bg-card transition-shadow hover:shadow-md">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-2">
                                                        <p className="font-sans text-sm font-medium text-muted-foreground">Data Storage</p>
                                                        <p className="font-sans text-3xl font-bold text-foreground">2.4GB</p>
                                                    </div>
                                                    <div className="rounded-full bg-secondary/50 p-3">
                                                        <Database className="h-6 w-6 text-secondary-foreground" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>

                                {/* System Overview - Full Width */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="font-sans text-2xl font-bold text-foreground">System Overview</h2>
                                        <Button variant="outline" size="sm" className="font-sans font-medium">
                                            View Reports
                                        </Button>
                                    </div>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-0">
                                            <EnhancedDocumentTable />
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
