import { redirect } from 'next/navigation';

export default function DoctorLoginRedirect() {
  redirect('/portal/staff-access');
}
