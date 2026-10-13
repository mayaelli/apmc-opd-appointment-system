import { redirect } from 'next/navigation';

export default function AdminLoginRedirect() {
  redirect('/portal/staff-access');
}
