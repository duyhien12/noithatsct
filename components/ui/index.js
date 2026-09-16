/**
 * Điểm nhập duy nhất của thư viện giao diện HomeERP.
 *
 *   import { PageContainer, PageHeader, Button, Table, Badge } from '@/components/ui';
 */

export { default as PageContainer, Stack } from './PageContainer';
export { default as PageHeader, Breadcrumbs } from './PageHeader';

export { default as Button, IconButton } from './Button';

export {
    default as Field,
    Field as FormField,
    Input,
    Select,
    Textarea,
    Checkbox,
    FormSection,
    FormGrid,
    FormActions,
} from './Form';

export { default as Card, CardGrid } from './Card';
export { default as StatCard, StatGrid } from './StatCard';

export { default as Badge, toneOf } from './Badge';
export { default as StatusBadge } from './StatusBadge';

export { default as Table, RowMenu, TablePagination } from './Table';
export { default as DataTable } from './DataTable';
export { default as Pagination } from './Pagination';

export { default as Modal } from './Modal';
export { default as ConfirmDialog } from './ConfirmDialog';

export { ToastProvider, useToast } from './Toast';

export {
    default as Skeleton,
    SkeletonCard,
    SkeletonStats,
    SkeletonTable,
    Spinner,
    LoadingArea,
} from './Skeleton';

export {
    default as EmptyState,
    NoResultsState,
    ErrorState,
    ForbiddenState,
} from './States';

export { default as SearchBar } from './SearchBar';
export { default as FilterBar } from './FilterBar';
export { default as FormGroup } from './FormGroup';
export { default as KPICard } from './KPICard';
