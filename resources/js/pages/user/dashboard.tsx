import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UserDocumentTable from '@/components/user-document-table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { IconBell, IconClock, IconFileText, IconUpload, IconUser } from '@tabler/icons-react';
import { CheckCircle2, Clock, Download, FileText, Plus, XCircle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'User Dashboard',
        href: '/user/dashboard',
    },
];

interface UserDashboardProps {
    user: {
        name: string;
        email: string;
        role: string;
        company: string;
        jabatan: string;
        profile?: {
            phone: string;
            address: string;
        };
    };
    statistics: {
        pending_documents: number;
        approved_documents: number;
        total_submitted: number;
        rejected_documents: number;
    };
    recent_documents: Array<{
        id: number;
        name: string;
        status: string;
        submitted_at: string;
        category: string;
        size: string;
    }>;
    available_masterflows?: Array<{
        id: number;
        name: string;
        description: string;
        steps_count: number;
        company?: string;
    }>;
}

export default function UserDashboard({ user, statistics, recent_documents, available_masterflows }: UserDashboardProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Dashboard" />
            <div className="flex min-h-screen flex-1 flex-col bg-white">
                <div className="@container/main flex flex-1 flex-col">
                    {/* Header Section */}
                    <div className="px-4 py-6 lg:px-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <h1 className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight text-gray-900">
                                    <IconUser className="h-6 w-6 text-primary" />
                                    Welcome back, {user?.name}
                                </h1>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Track and manage your document submissions.</p>
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <strong>Company:</strong> {user?.company || 'No Company Assigned'}
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <strong>Position:</strong> {user?.jabatan || 'No Position Assigned'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    {user?.role} Access
                                </Badge>
                                <Button size="sm" className="flex">
                                    <IconUpload className="mr-2 h-4 w-4" />
                                    Upload Document
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="px-4 lg:px-6">
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">My Pending Documents</p>
                                            <p className="text-2xl font-bold">{statistics?.pending_documents || 0}</p>
                                        </div>
                                        <Clock className="h-8 w-8 text-orange-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Approved Documents</p>
                                            <p className="text-2xl font-bold">{statistics?.approved_documents || 0}</p>
                                        </div>
                                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Rejected Documents</p>
                                            <p className="text-2xl font-bold">{statistics?.rejected_documents || 0}</p>
                                        </div>
                                        <XCircle className="h-8 w-8 text-red-500" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Total Submitted</p>
                                            <p className="text-2xl font-bold">{statistics?.total_submitted || 0}</p>
                                        </div>
                                        <FileText className="h-8 w-8 text-blue-500" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* My Documents */}
                    <div className="flex-1 px-4 py-6 lg:px-6">
                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* Documents Table - Takes 2/3 of the space */}
                            <div className="space-y-4 lg:col-span-2">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <h2 className="font-serif text-lg font-semibold">My Documents</h2>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="sm:hidden">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" className="hidden sm:flex">
                                            <IconUpload className="mr-2 h-4 w-4" />
                                            Upload New
                                        </Button>
                                    </div>
                                </div>
                                <UserDocumentTable documents={recent_documents} />
                            </div>

                            {/* Sidebar - Takes 1/3 of the space */}
                            <div className="space-y-6">
                                {/* Quick Actions */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base font-medium">
                                            <Plus className="h-4 w-4" />
                                            Quick Actions
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Button variant="outline" size="sm" className="w-full justify-start">
                                            <IconFileText className="mr-2 h-4 w-4" />
                                            New Document
                                        </Button>
                                        <Button variant="outline" size="sm" className="w-full justify-start">
                                            <Download className="mr-2 h-4 w-4" />
                                            Download Template
                                        </Button>
                                        <Button variant="outline" size="sm" className="w-full justify-start">
                                            <IconBell className="mr-2 h-4 w-4" />
                                            Check Notifications
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Recent Activity */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-base font-medium">
                                            <IconClock className="h-4 w-4" />
                                            Recent Activity
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium">Document Approved</p>
                                                <p className="text-xs text-muted-foreground">Proposal Kegiatan Q1 was approved</p>
                                                <p className="text-xs text-muted-foreground">2 hours ago</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <Clock className="mt-0.5 h-4 w-4 text-orange-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium">Document Submitted</p>
                                                <p className="text-xs text-muted-foreground">Laporan Keuangan Bulanan submitted for review</p>
                                                <p className="text-xs text-muted-foreground">1 day ago</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0">
                                                <FileText className="mt-0.5 h-4 w-4 text-blue-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium">New Template Available</p>
                                                <p className="text-xs text-muted-foreground">Budget proposal template updated</p>
                                                <p className="text-xs text-muted-foreground">3 days ago</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Available Workflows */}
                                {available_masterflows && available_masterflows.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-base font-medium">
                                                <IconFileText className="h-4 w-4" />
                                                Available Workflows
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {available_masterflows.slice(0, 3).map((masterflow) => (
                                                <div key={masterflow.id} className="rounded-md border p-3">
                                                    <div className="space-y-1">
                                                        <h4 className="text-sm font-medium">{masterflow.name}</h4>
                                                        <p className="line-clamp-2 text-xs text-muted-foreground">
                                                            {masterflow.description || 'No description available'}
                                                        </p>
                                                        <div className="flex items-center justify-between pt-1">
                                                            <span className="text-xs text-muted-foreground">{masterflow.steps_count} steps</span>
                                                            <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                                                                Use
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {available_masterflows.length > 3 && (
                                                <Button variant="outline" size="sm" className="w-full text-xs">
                                                    View All ({available_masterflows.length} workflows)
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
