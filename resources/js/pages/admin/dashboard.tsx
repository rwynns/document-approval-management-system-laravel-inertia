import { AppSidebar } from '@/components/app-sidebar';
import { EnhancedDocumentTable } from '@/components/enhanced-document-table';
import { SectionCards } from '@/components/section-cards';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Head } from '@inertiajs/react';
import { IconFileText, IconSparkles, IconUsers } from '@tabler/icons-react';
import { Activity, CalendarDays, CheckCircle2, Clock } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <>
            <Head title="Admin Dashboard" />
            <SidebarProvider>
                <AppSidebar variant="inset" />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex flex-1 flex-col">
                        <div className="@container/main flex flex-1 flex-col gap-2 p-6">
                            <div className="space-y-8">
                                {/* Header Section */}
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-foreground">
                                            <IconSparkles className="h-6 w-6 text-primary" />
                                            Admin Dashboard
                                        </h1>
                                        <p className="font-sans text-sm text-muted-foreground">
                                            Welcome to Admin Dashboard - Document Approval Management System.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-sans text-xs">
                                            Realtime Enabled
                                        </Badge>
                                        <Button size="sm" className="hidden font-sans sm:flex">
                                            <IconFileText className="mr-2 h-4 w-4" />
                                            New Document
                                        </Button>
                                    </div>
                                </div>
                                {/* Stats Cards */}
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Pending Reviews</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">12</p>
                                                </div>
                                                <Clock className="h-8 w-8 text-accent" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Approved Today</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">8</p>
                                                </div>
                                                <CheckCircle2 className="h-8 w-8 text-primary" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Total Documents</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">124</p>
                                                </div>
                                                <IconFileText className="h-8 w-8 text-chart-3" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-border bg-card">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-sans text-sm font-medium text-muted-foreground">Active Users</p>
                                                    <p className="font-sans text-2xl font-bold text-foreground">45</p>
                                                </div>
                                                <IconUsers className="h-8 w-8 text-chart-2" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Recent Activity & Quick Actions */}
                                <div className="grid gap-6 lg:grid-cols-3">
                                    <div className="lg:col-span-2">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h2 className="font-serif text-lg font-semibold text-foreground">Recent Documents</h2>
                                                <Button variant="outline" size="sm" className="font-sans">
                                                    View All
                                                </Button>
                                            </div>
                                            <EnhancedDocumentTable />
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">Quick Actions</h2>
                                            <SectionCards />
                                        </div>
                                        <div>
                                            <h2 className="mb-4 font-serif text-lg font-semibold text-foreground">Recent Activity</h2>
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                                                    <Activity className="mt-0.5 h-4 w-4 text-chart-3" />
                                                    <div className="flex-1 space-y-1">
                                                        <p className="font-sans text-sm font-medium text-foreground">Document Approved</p>
                                                        <p className="font-sans text-xs text-muted-foreground">
                                                            Annual Report 2024 has been approved by John Doe
                                                        </p>
                                                    </div>
                                                    <span className="font-sans text-xs text-muted-foreground">2m ago</span>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                                                    <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                                                    <div className="flex-1 space-y-1">
                                                        <p className="font-sans text-sm font-medium text-foreground">New Submission</p>
                                                        <p className="font-sans text-xs text-muted-foreground">
                                                            Budget Proposal Q1 submitted for review
                                                        </p>
                                                    </div>
                                                    <span className="font-sans text-xs text-muted-foreground">5m ago</span>
                                                </div>
                                                <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                                                    <IconUsers className="mt-0.5 h-4 w-4 text-accent" />
                                                    <div className="flex-1 space-y-1">
                                                        <p className="font-sans text-sm font-medium text-foreground">User Assignment</p>
                                                        <p className="font-sans text-xs text-muted-foreground">
                                                            Jane Smith assigned to Marketing Project
                                                        </p>
                                                    </div>
                                                    <span className="font-sans text-xs text-muted-foreground">10m ago</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </>
    );
}
