// types/appointment.ts

export type AppointmentCategory = 'new-checkup' | 'follow-up' | 'philhealth-yakap';

export interface BaseAppointmentDetails {
  fullName: string;
  phone: string;
}

export interface NewCheckupDetails extends BaseAppointmentDetails {
  age: string;
  sex: string;
  chiefComplaint: string;
}

export interface FollowUpDetails extends BaseAppointmentDetails {
  previousDoctorOrDepartment: string;
  purpose: string;
}

export interface PhilHealthYakapDetails extends BaseAppointmentDetails {
  philhealthPin: string;
  serviceType: string;
}