import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@inertiajs/react';
import { Eye, FileText } from 'lucide-react';

interface Document {
    id: number;
    title: string;
    status: string;
    created_at: string;
    updated_at: string;
}

interface UserDocumentTableProps {
    documents?: Document[];
}

export default function UserDocumentTable({ documents = [] }: UserDocumentTableProps) {
    const getStatusVariant = (status: string) => {
        switch (status.toLowerCase()) {
            case 'approved':
                return 'default';
            case 'pending':
                return 'secondary';
            case 'rejected':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    if (documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No documents yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">Get started by creating your first document.</p>
                <Button asChild className="mt-4">
                    <Link href={route('dokumen.create')}>Create Document</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => (
                        <TableRow key={doc.id}>
                            <TableCell className="font-medium">{doc.title}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(doc.status)}>{doc.status}</Badge>
                            </TableCell>
                            <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" asChild>
                                    <Link href={route('dokumen.show', doc.id)}>
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
