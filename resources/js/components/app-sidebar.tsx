import {
    BriefcaseIcon,
    BuildingIcon,
    CheckSquareIcon,
    FileTextIcon,
    FolderKanbanIcon,
    GlobeIcon,
    LayoutDashboardIcon,
    ShieldIcon,
    UserIcon,
    UsersIcon,
} from 'lucide-react';
import * as React from 'react';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { usePage } from '@inertiajs/react';

// Super Admin Menu Items
const superAdminNavMain = [
    {
        title: 'Dashboard',
        url: '/super-admin/dashboard',
        icon: LayoutDashboardIcon,
    },
    {
        title: 'Dokumen Saya',
        url: '/user/dokumen',
        icon: FileTextIcon,
    },
    {
        title: 'Approvals',
        url: '/approvals',
        icon: CheckSquareIcon,
    },
    {
        title: 'Profile',
        url: '/settings/profile',
        icon: UserIcon,
    },
    {
        title: 'Role Management',
        url: '/super-admin/role-management',
        icon: ShieldIcon,
    },
    {
        title: 'Company Management',
        url: '/super-admin/company-management',
        icon: BuildingIcon,
    },
    {
        title: 'Jabatan Management',
        url: '/super-admin/jabatan-management',
        icon: BriefcaseIcon,
    },
    {
        title: 'Aplikasi Management',
        url: '/super-admin/aplikasi-management',
        icon: GlobeIcon,
    },
    {
        title: 'User Management',
        url: '/super-admin/user-management',
        icon: UsersIcon,
    },
];

// Admin Menu Items
const adminNavMain = [
    {
        title: 'Dashboard',
        url: '/admin/dashboard',
        icon: LayoutDashboardIcon,
    },
    {
        title: 'Dokumen Saya',
        url: '/user/dokumen',
        icon: FileTextIcon,
    },
    {
        title: 'Approvals',
        url: '/approvals',
        icon: CheckSquareIcon,
    },
    {
        title: 'Profile',
        url: '/settings/profile',
        icon: UserIcon,
    },
    {
        title: 'Masterflow Management',
        url: '/admin/masterflows',
        icon: FolderKanbanIcon,
    },
    {
        title: 'Dokumen',
        url: '/admin/dokumen',
        icon: FileTextIcon,
    },
];

// User Menu Items
const userNavMain = [
    {
        title: 'Dashboard',
        url: '/user/dashboard',
        icon: LayoutDashboardIcon,
    },
    {
        title: 'Dokumen Saya',
        url: '/user/dokumen',
        icon: FileTextIcon,
    },
    {
        title: 'Approvals',
        url: '/approvals',
        icon: CheckSquareIcon,
    },
    {
        title: 'Profile',
        url: '/settings/profile',
        icon: UserIcon,
    },
];

// Removed navSecondary and documents arrays as they're not needed

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { props: pageProps } = usePage<any>();
    const user = pageProps.auth?.user;

    // Debug: Log the entire user object
    console.log('=== SIDEBAR DEBUG ===');
    console.log('Full User Object:', user);
    console.log('user_auths:', user?.user_auths);
    console.log('==================');

    // Determine menu items based on user role
    let navMainItems = userNavMain;
    let sidebarTitle = 'Document Approval Management System';
    let roleLabel = 'User';

    // Check for user_auths (snake_case from Laravel)
    const userAuths = user?.user_auths || user?.userAuths;

    if (userAuths && userAuths.length > 0) {
        const primaryRole = userAuths[0]?.role?.role_name;
        const roleNameLower = primaryRole?.toLowerCase() || '';

        // Debug logging
        console.log('User Role Detection:', {
            primaryRole,
            roleNameLower,
            userAuths: userAuths,
        });

        if (roleNameLower === 'super admin' || primaryRole === 'Super Admin') {
            navMainItems = superAdminNavMain;
            sidebarTitle = 'Super Admin Panel';
            roleLabel = 'Super Admin';
            console.log('✅ Super Admin menu selected');
        } else if (roleNameLower === 'admin' || primaryRole === 'Admin') {
            navMainItems = adminNavMain;
            sidebarTitle = 'Admin Panel';
            roleLabel = 'Admin';
            console.log('✅ Admin menu selected, items:', adminNavMain);
        } else if (roleNameLower === 'user' || primaryRole === 'User') {
            navMainItems = userNavMain;
            sidebarTitle = 'User Panel';
            roleLabel = 'User';
            console.log('✅ User menu selected');
        } else {
            navMainItems = superAdminNavMain;
            sidebarTitle = 'Application';
            roleLabel = primaryRole || 'User';
            console.log('⚠️ Fallback to super admin menu for role:', primaryRole);
        }
    } else {
        navMainItems = superAdminNavMain;
        console.log('❌ No userAuths found, using super admin menu');
    }

    const userData = {
        name: user?.name || 'User',
        email: user?.email || 'user@example.com',
        avatar: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=4ba443&color=ffffff`,
    };

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
                            <a href="/">
                                <FileTextIcon className="h-5 w-5" />
                                <span className="text-base font-semibold">{sidebarTitle}</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMainItems} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={userData} />
            </SidebarFooter>
        </Sidebar>
    );
}
