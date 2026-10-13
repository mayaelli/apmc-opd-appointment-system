import { redirect } from 'next/navigation';

export default function HeadLoginRedirect() {
  redirect('/portal/staff-access');
}
