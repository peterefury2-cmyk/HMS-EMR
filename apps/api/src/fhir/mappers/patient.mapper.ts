import { Patient, Gender } from '@prisma/client';
import { FhirPatient } from '../interfaces/fhir.interfaces';

export class PatientMapper {
  static toFhir(patient: Patient): FhirPatient {
    const genderMap: Record<Gender, string> = {
      [Gender.MALE]: 'male',
      [Gender.FEMALE]: 'female',
      [Gender.OTHER]: 'other',
      [Gender.PREFER_NOT_TO_SAY]: 'unknown',
    };

    return {
      resourceType: 'Patient',
      id: patient.id,
      meta: { lastUpdated: patient.updatedAt.toISOString() },
      identifier: [{ system: 'urn:oid:2.16.840.1.113883.4.1', value: patient.patientNo }],
      name: [{ use: 'official', family: patient.lastName, given: [patient.firstName] }],
      gender: genderMap[patient.gender],
      birthDate: patient.dateOfBirth.toISOString().split('T')[0],
      telecom: [
        { system: 'phone', value: patient.phone, use: 'mobile' },
        ...(patient.email ? [{ system: 'email', value: patient.email }] : []),
      ],
      address: patient.address
        ? [{ use: 'home', line: [patient.address] }]
        : [],
      ...(patient.bloodGroup && {
        extension: [
          {
            url: 'http://hl7.org/fhir/StructureDefinition/patient-bloodgroup',
            valueString: patient.bloodGroup,
          },
        ],
      }),
    };
  }

  static fromFhir(fhir: FhirPatient): Partial<Patient> {
    const reverseGender: Record<string, Gender> = {
      male: Gender.MALE,
      female: Gender.FEMALE,
      other: Gender.OTHER,
      unknown: Gender.PREFER_NOT_TO_SAY,
    };

    return {
      ...(fhir.id && { id: fhir.id }),
      firstName: fhir.name?.[0]?.given?.[0] ?? '',
      lastName: fhir.name?.[0]?.family ?? '',
      gender: reverseGender[fhir.gender ?? 'unknown'] ?? Gender.PREFER_NOT_TO_SAY,
      ...(fhir.birthDate && { dateOfBirth: new Date(fhir.birthDate) }),
      phone: fhir.telecom?.find((t) => t.system === 'phone')?.value ?? '',
      email: fhir.telecom?.find((t) => t.system === 'email')?.value,
    };
  }
}
