import { NotificationListener } from '@/components/NotificationListener';
import { type ReactNode } from 'react';

interface AppWrapperProps {
    children: ReactNode;
}

/**
 * AppWrapper component that wraps the entire application
 * and provides global functionality like notification listening.
 */
export function AppWrapper({ children }: AppWrapperProps) {
    return (
        <>
            <NotificationListener />
            {children}
        </>
    );
}

export default AppWrapper;
