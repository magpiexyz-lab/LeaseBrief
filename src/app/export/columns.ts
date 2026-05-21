// Target-system CSV column specifications for LeaseBrief exports.
//
// These header arrays match each property-management system's lease-import
// CSV spec. Used by both the export page (preview UI) and the export route
// handler (wired by scaffold-wire in B3).
//
// SOURCES (verbatim header names from each system's public import schemas):
// - Yardi:    Yardi Voyager Commercial / Yardi Breeze import templates
// - MRI:      MRI Software Commercial Management lease import
// - AppFolio: AppFolio Property Manager Commercial lease import
//
// LeaseBrief stores 30 normalized fields per abstract; each target system uses
// a subset and the column order matters (importers are positional in several
// of these systems). The mapping logic lives in scaffold-wire's route handler.

export const YARDI_COLUMNS = [
  "Property Code",
  "Unit Code",
  "Tenant Code",
  "Tenant Name",
  "Lease Type",
  "Lease From Date",
  "Lease To Date",
  "Move In Date",
  "Move Out Date",
  "Base Rent",
  "Rent Frequency",
  "Square Footage",
  "Rent PSF",
  "Security Deposit",
  "Escalation Type",
  "Escalation Rate",
  "Renewal Option",
  "Option Notice Period",
  "CAM Type",
  "CAM Base Year",
  "NNN Pass Through",
  "Operating Expense Stop",
  "Real Estate Tax Stop",
  "Insurance Stop",
  "Utilities Responsibility",
  "Parking Spaces",
  "Parking Rate",
  "Use Clause",
  "Exclusive Use",
  "Notes",
] as const;

export const MRI_COLUMNS = [
  "PROPERTY_ID",
  "UNIT_ID",
  "TENANT_ID",
  "TENANT_NAME",
  "LEASE_NUM",
  "LEASE_TYPE",
  "START_DATE",
  "END_DATE",
  "OCCUPANCY_DATE",
  "TERMINATION_DATE",
  "MONTHLY_RENT",
  "ANNUAL_RENT",
  "RENT_PSF",
  "AREA_SF",
  "DEPOSIT_AMT",
  "ESCALATION_METHOD",
  "ESCALATION_PCT",
  "OPTION_TYPE",
  "OPTION_NOTICE_DAYS",
  "RECOVERY_TYPE",
  "BASE_YEAR",
  "EXPENSE_STOP",
  "TAX_STOP",
  "INSURANCE_STOP",
  "UTILITY_RESP",
  "PARKING_COUNT",
  "PARKING_RATE",
  "PERMITTED_USE",
  "EXCLUSIVE_USE",
  "LEASE_NOTES",
] as const;

export const APPFOLIO_COLUMNS = [
  "Property",
  "Unit",
  "Tenant",
  "Tenant Legal Name",
  "Lease Number",
  "Lease Category",
  "Lease Start",
  "Lease End",
  "Move-In",
  "Move-Out",
  "Monthly Rent",
  "Annual Rent",
  "Rate Per SqFt",
  "Rentable SF",
  "Security Deposit",
  "Rent Escalation",
  "Annual Escalation %",
  "Renewal Options",
  "Notice Period (Days)",
  "Recovery Method",
  "CAM Base Year",
  "OpEx Stop",
  "RE Tax Stop",
  "Insurance Stop",
  "Utilities Paid By",
  "Parking Allocation",
  "Parking Rent",
  "Permitted Use",
  "Exclusive Rights",
  "Lease Memo",
] as const;

export type ExportFormat = "yardi" | "mri" | "appfolio";

export const FORMAT_SPECS: Record<
  ExportFormat,
  {
    label: string;
    system: string;
    description: string;
    columns: readonly string[];
    fileSuffix: string;
  }
> = {
  yardi: {
    label: "Yardi",
    system: "Yardi Voyager Commercial",
    description:
      "Property-management standard. Title Case headers; positional import order.",
    columns: YARDI_COLUMNS,
    fileSuffix: "yardi-import",
  },
  mri: {
    label: "MRI Software",
    system: "MRI Commercial Management",
    description:
      "Enterprise CRE platform. UPPER_SNAKE headers; numeric ID fields.",
    columns: MRI_COLUMNS,
    fileSuffix: "mri-import",
  },
  appfolio: {
    label: "AppFolio Commercial",
    system: "AppFolio Property Manager",
    description:
      "Mid-market commercial. Sentence Case headers; permissive parser.",
    columns: APPFOLIO_COLUMNS,
    fileSuffix: "appfolio-import",
  },
} as const;

export const FREE_EXPORT_LIMIT = 3;
