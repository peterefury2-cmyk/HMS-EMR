// FHIR R4 Patient mapper

interface PatientModel {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}

interface FhirHumanName {
  use: string;
  family: string;
  given: string[];
}

interface FhirTelecom {
  system: string;
  value: string;
  use?: string;
}

interface FhirAddress {
  text: string;
}

interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{ system: string; value: string }>;
  name: FhirHumanName[];
  gender: string;
  birthDate: string;
  telecom: FhirTelecom[];
  address?: FhirAddress[];
}

const genderMap: Record<string, string> = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
};

export function mapPatientToFhir(patient: PatientModel): FhirPatient {
  const fhir: FhirPatient = {
    resourceType: 'Patient',
    id: patient.id,
    identifier: [
      {
        system: 'http://hms-emr.local/patient-number',
        value: patient.patientNo,
      },
    ],
    name: [
      {
        use: 'official',
        family: patient.lastName,
        given: [patient.firstName],
      },
    ],
    gender: genderMap[patient.gender] ?? 'unknown',
    birthDate: patient.dateOfBirth.toISOString().split('T')[0],
    telecom: [{ system: 'phone', value: patient.phone, use: 'mobile' }],
  };

  if (patient.email) {
    fhir.telecom.push({ system: 'email', value: patient.email });
  }

  if (patient.address) {
    fhir.address = [{ text: patient.address }];
  }

  return fhir;
}
