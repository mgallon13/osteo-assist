import { Navigate, Route, Routes } from 'react-router'
import { Spinner } from '@/components/ui'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth, useWorkspace } from '@/features/auth/AuthProvider'
import { LoginPage } from '@/features/auth/LoginPage'
import { OnboardingPage } from '@/features/auth/OnboardingPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { PatientsPage } from '@/features/patients/PatientsPage'
import { PatientFormPage } from '@/features/patients/PatientFormPage'
import { PatientDetailPage } from '@/features/patients/PatientDetailPage'
import { ConsultationPage } from '@/features/consultations/ConsultationPage'
import { MethodProfilePage } from '@/features/method-profile/MethodProfilePage'
import type { ReactNode } from 'react'

function ClinicalOnly({ children }: { children: ReactNode }) {
  const { canAccessClinical } = useWorkspace()
  return canAccessClinical ? children : <Navigate to="/" replace />
}

export default function App() {
  const { session, sessionLoading, membership, workspaceLoading } = useAuth()

  if (sessionLoading || workspaceLoading) return <Spinner />
  if (!session) return <LoginPage />
  if (!membership) return <OnboardingPage />

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/nouveau" element={<PatientFormPage />} />
        <Route path="patients/:patientId" element={<PatientDetailPage />} />
        <Route path="patients/:patientId/modifier" element={<PatientFormPage />} />
        <Route path="consultations/:consultationId" element={<ClinicalOnly><ConsultationPage /></ClinicalOnly>} />
        <Route path="methode" element={<ClinicalOnly><MethodProfilePage /></ClinicalOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
