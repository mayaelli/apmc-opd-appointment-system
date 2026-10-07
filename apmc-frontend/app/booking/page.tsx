'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BookingSidebarTracker from '@/components/booking/BookingSidebarTracker';
import CategorySelector from '@/components/booking/CategorySelector';
import SchedulePickerView from '@/components/booking/SchedulePickerView';
import PatientDetailsView from '@/components/booking/PatientDetailsView';
import AppointmentTicketView from '@/components/booking/AppointmentTicketView';
import {
  AppointmentCategory,
  BaseAppointmentDetails,
  NewCheckupDetails,
  FollowUpDetails,
  PhilHealthYakapDetails,
} from '@/app/types/appointment';

const CATEGORY_CODES: Record<AppointmentCategory, string> = {
  'new-checkup': 'NCC',
  'follow-up': 'FUC',
  'philhealth-yakap': 'PHY',
};

function generateQueueId(category: AppointmentCategory, date: string): string {
  const code = CATEGORY_CODES[category];
  const datePart = date.replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 9999 + 1)
    .toString()
    .padStart(4, '0');
  return `APMC-${code}-${datePart}-${randomPart}`;
}

export default function BookingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<AppointmentCategory | null>(null);
  const [scheduleData, setScheduleData] = useState({ office: '', date: '', slot: '' });
  const [patientDetails, setPatientDetails] = useState<
    NewCheckupDetails | FollowUpDetails | PhilHealthYakapDetails | null
  >(null);
  const [ticket, setTicket] = useState<{ queueId: string } | null>(null);

  // Step 1 handlers
  function handleCategorySelect(category: AppointmentCategory) {
    setSelectedCategory(category);
  }

  function handleStep1Next() {
    setCurrentStep(2);
  }

  // Step 2 handlers
  function handleStep2Next() {
    setCurrentStep(3);
  }

  // Step 3 handler — generates ticket on completion
  function handleStep3Next(details: NewCheckupDetails | FollowUpDetails | PhilHealthYakapDetails) {
    const queueId = generateQueueId(selectedCategory!, scheduleData.date);
    setPatientDetails(details);
    setTicket({ queueId });
    setCurrentStep(4);
  }

  // Reset everything
  function handleReset() {
    setCurrentStep(1);
    setSelectedCategory(null);
    setScheduleData({ office: '', date: '', slot: '' });
    setPatientDetails(null);
    setTicket(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">OPD Appointment Booking</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete all steps to secure your digital queue pass for the Outpatient Department.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 lg:gap-8 gap-6">
          {/* Content column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
              {currentStep === 1 && (
                <CategorySelector
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleCategorySelect}
                  onNext={handleStep1Next}
                />
              )}

              {currentStep === 2 && selectedCategory && (
                <SchedulePickerView
                  category={selectedCategory}
                  selectedOffice={scheduleData.office}
                  selectedDate={scheduleData.date}
                  selectedSlot={scheduleData.slot}
                  onOfficeChange={(v) => setScheduleData((p) => ({ ...p, office: v }))}
                  onDateChange={(v) => setScheduleData((p) => ({ ...p, date: v }))}
                  onSlotChange={(v) => setScheduleData((p) => ({ ...p, slot: v }))}
                  onNext={handleStep2Next}
                  onBack={() => setCurrentStep(1)}
                />
              )}

              {currentStep === 3 && selectedCategory && (
                <PatientDetailsView
                  category={selectedCategory}
                  onNext={handleStep3Next}
                  onBack={() => setCurrentStep(2)}
                />
              )}

              {currentStep === 4 && ticket && selectedCategory && (
                <AppointmentTicketView
                  queueId={ticket.queueId}
                  patientName={(patientDetails as BaseAppointmentDetails)?.fullName ?? ''}
                  category={selectedCategory}
                  office={scheduleData.office}
                  date={scheduleData.date}
                  slot={scheduleData.slot}
                  onReset={handleReset}
                />
              )}
            </div>
          </div>

          {/* Sidebar column */}
          <div className="lg:col-span-1">
            <BookingSidebarTracker currentStep={currentStep} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
