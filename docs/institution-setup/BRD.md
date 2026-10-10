# Business Requirements Document (BRD) — Institution Setup

|                    |                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Product            | Edulynk ERP (web)                                                                                                        |
| Module             | Institution Setup (`/institution-setup`)                                                                                 |
| Document type      | Business Requirements Document                                                                                           |
| Version            | 1.0                                                                                                                      |
| Date               | 11 October 2026                                                                                                          |
| Companion document | [BRS — Business Requirements Specification](./BRS.md) (detailed, testable requirements)                                  |
| Status             | Reflects the behaviour built in the web app (demo services). The production institution API must enforce the same rules. |

---

## 1. Executive summary

Institution Setup is where an education provider configures itself in Edulynk ERP before (and while) running day-to-day operations. One screen holds the institution's identity, contact and address details, campuses and locations, academic structure, academic calendar, grading rules, branding, operating policies and the list of features its subscription includes.

Edulynk serves every kind of education provider, not only schools. The **institution type** (School, Junior/Intermediate College, Degree College, University, Coaching/Training Institute, Other) drives the vocabulary, academic structure, required regulatory identifiers, location kinds and starting defaults across the ERP, so each customer sees an ERP that speaks its language ("Class & Section" for a school, "Programme & Semester" for a university, "Course & Batch" for a coaching centre).

## 2. Business problem

1. Education providers differ in structure: schools run classes and sections, colleges run programmes and semesters, coaching institutes run courses and batches. A school-only data model forces non-school customers into workarounds and wrong terminology.
2. Setup data (name, address, academic years, structure, grading) is used by almost every other module (admissions, attendance, timetable, examinations, fees, reports). Incomplete or inconsistent setup causes downstream errors.
3. Configuration changes affect many users; they must be controlled (who can change what), traceable (audit) and safe (no accidental deletion of data in use).
4. Subscription entitlements are commercial decisions and must not be changeable by the customer's own staff.

## 3. Business objectives

| ID   | Objective                                                              | Measure of success                                                                                         |
| ---- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| BO-1 | Let any education provider type configure the ERP without workarounds. | All six institution types can complete setup with type-appropriate fields and structure.                   |
| BO-2 | Reduce setup errors that break downstream modules.                     | Every field validated at entry and again by the service; no invalid record can be saved.                   |
| BO-3 | Shorten time-to-go-live for new customers.                             | Starter structure templates and type defaults; one-page General Information; guided "Show what's missing". |
| BO-4 | Protect configuration integrity.                                       | Role- and campus-based permissions; records in use cannot be deleted; full audit trail.                    |
| BO-5 | Protect revenue and contractual terms.                                 | Entitlements are read-only to customers; no user can grant themselves permissions or features.             |
| BO-6 | Keep the institution's brand consistent.                               | Branding (name, colours, logo) applied across the ERP from one place.                                      |

## 4. Scope

### 4.1 In scope

1. **General Information** — institution type, basic information, type-specific regulatory identifiers, contact details and registered address (one page).
2. **Campuses & Locations** — campuses, branches, study centres, constituent and affiliated colleges (as allowed by type).
3. **Academic Structure** — type-specific levels (e.g. Department → Programme → Semester → Course), naming, period type; for schools, Classes & Sections, Subjects and Departments.
4. **Academic Calendar** — academic years (planned/current/closed), terms or semesters, holidays, examinations, events and meetings.
5. **Grading & Assessment** — method (marks, grades, GPA, CGPA), pass rules, grade bands, assessment components, transcript layout, type defaults.
6. **Branding & Appearance** — display name, tagline, colours, logo; regional defaults (time zone, language, date and time formats).
7. **Policies & Preferences** — working days and hours, attendance thresholds, fee defaults, notification preferences.
8. **Feature Entitlements** — read-only view of modules included in the subscription, highlighting those key to the institution type.
9. **Export** of the setup as a file; **audit logging** of every change; **side panels** (logo, quick information, permission summary).

### 4.2 Out of scope

1. Changing the subscription plan or entitlements (handled by Edulynk commercial operations).
2. User and role management (Users & Access module), except linking to it.
3. Student enrolment, fee structures, timetables and examinations themselves (they consume setup data).
4. Multi-institution (group) management across tenants.
5. Real email/SMS delivery for notification preferences (only the preferences are stored here).

## 5. Stakeholders and users

| Stakeholder                     | Interest                                                   | Typical access                                           |
| ------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| Institution Owner / Chairman    | Overall configuration; type changes; current academic year | View, create, edit, delete, export, approve; branding    |
| Institution Administrator       | Day-to-day setup maintenance                               | View, create, edit, delete, export (no approve)          |
| Principal / Head of Institution | Academic structure, calendar, grading                      | Depends on role configuration                            |
| Campus-scoped administrator     | Their own campuses' records                                | Campus records only; institution-wide settings read-only |
| Staff with view access          | Reference information                                      | View only (read-only badge)                              |
| Edulynk operations              | Entitlements, support                                      | Outside this module                                      |
| Auditors / management           | Traceability                                               | Audit log (Reports)                                      |

## 6. Business requirements (summary)

Detailed, testable requirements with IDs are in the [BRS](./BRS.md). The business-level requirements are:

| ID    | Business requirement                                                                                                                                                                                  | Priority |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-01 | The institution shall select one institution type, which determines terminology, structure, required identifiers, location kinds and defaults across the ERP.                                         | Must     |
| BR-02 | Changing the institution type shall require the Approve permission, an explicit confirmation, and shall never delete existing data; switching back restores the earlier type's details and structure. | Must     |
| BR-03 | The institution's identity, regulatory identifiers, contact details and registered address shall be maintained on a single General Information page.                                                  | Must     |
| BR-04 | Only the identifiers that apply to the selected type shall be requested and required.                                                                                                                 | Must     |
| BR-05 | The institution shall maintain one or more campuses/locations of the kinds its type allows; at least one shall always remain active.                                                                  | Must     |
| BR-06 | The institution shall define its academic structure in the levels of its type, and may rename levels to its own vocabulary.                                                                           | Must     |
| BR-07 | Non-school types shall be able to load a starter structure template when their structure is empty.                                                                                                    | Should   |
| BR-08 | The institution shall maintain academic years with one current year, and divide each into non-overlapping terms or semesters.                                                                         | Must     |
| BR-09 | The institution shall maintain a calendar of holidays, examinations, events and meetings per campus.                                                                                                  | Must     |
| BR-10 | The institution shall define grading rules (method, pass marks, bands, components, transcript) and may load type defaults.                                                                            | Must     |
| BR-11 | The institution shall define branding (name, colours, logo) applied across the ERP; only users with branding permission may change it.                                                                | Must     |
| BR-12 | The institution shall define operating policies (working days and hours, attendance, fee defaults, notifications) and regional defaults.                                                              | Must     |
| BR-13 | The institution shall see which modules its subscription includes; no user shall be able to change entitlements or grant themselves permissions.                                                      | Must     |
| BR-14 | Every create, update and delete shall be authorised on the server and recorded in the audit log with who, what and when.                                                                              | Must     |
| BR-15 | Records still used elsewhere (e.g. a campus with students) shall not be deletable; the user shall be told what still uses them.                                                                       | Must     |
| BR-16 | Forms shall validate as the user types, keep Save disabled until required fields are valid, and show what is missing on request.                                                                      | Must     |
| BR-17 | The setup shall be exportable for backup and review by users with Export permission.                                                                                                                  | Should   |
| BR-18 | Unsaved changes shall be protected: the user is warned before leaving and can discard changes deliberately.                                                                                           | Must     |
| BR-19 | The module shall be accessible (WCAG 2.1 AA) and work on desktop and tablet widths.                                                                                                                   | Must     |
| BR-20 | The module shall preserve existing security controls (strict CSP, sealed server sessions) and only call APIs that exist.                                                                              | Must     |

## 7. Business rules (summary)

1. One institution per tenant; one institution type at a time.
2. Institution-wide settings (profile, structure naming, years, terms, subjects, departments, grading, policies) can only be changed by users who cover every campus.
3. Campus-scoped users manage only records of their own campuses.
4. Codes are unique within their kind; names are unique within their parent.
5. Only planned academic years can be deleted or made current; making a year current closes the previous current year; closed years are read-only.
6. Terms must fall inside their academic year and must not overlap.
7. Grade bands must cover 0–100 % without gaps or overlaps; assessment components must total 100 %.
8. Logos are PNG, JPG or WebP up to 1 MB (SVG is never accepted).
9. Entitlements are controlled by Edulynk under the subscription.

## 8. Assumptions

1. Each tenant represents one institution (which may have many campuses).
2. Roles and their permissions are managed in Users & Access; Institution Setup reads them.
3. Reference data (boards, universities' categories, accreditations, mediums, countries/states/districts/cities, time zones, languages) is maintained by Edulynk.
4. The production institution API will implement the same validation and authorisation as the demo services; the web app's validation is shared with the service layer.
5. Indian context by default (PIN code, UDISE, ₹ for fees), with country selection available.

## 9. Constraints

1. Strict Content Security Policy: no inline styles or scripts; no third-party UI kits that inject styles.
2. Authentication and session cookies are sealed on the server; nothing sensitive is stored in the browser except the demo data store.
3. The demo build stores data in the browser only; it must never be activated in production builds (verified by `verify:production-build`).

## 10. Dependencies

| Dependency                                                                                     | Why                                                          |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Users & Access (roles, grants, campus scope)                                                   | Determines who can view or change each part of setup.        |
| Subscription / entitlements service                                                            | Source of the Feature Entitlements list and plan name.       |
| Audit log                                                                                      | Records every change.                                        |
| Reference data                                                                                 | Drop-down lists and validation of identifiers and locations. |
| Downstream modules (admissions, attendance, timetable, examinations, fees, reports, dashboard) | Consume setup data and terminology.                          |

## 11. Risks and mitigations

| Risk                                                                        | Impact | Mitigation                                                                                                   |
| --------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| Changing institution type mid-year confuses users or breaks downstream data | High   | Approve permission, confirmation dialog, nothing deleted, earlier data restored on switch-back, audit entry. |
| Deleting a campus or year still in use                                      | High   | Deletion blocked with a message listing what still uses the record.                                          |
| Inconsistent grading rules produce wrong results                            | High   | Band coverage, overlap, pass-band and weightage-total rules enforced before save.                            |
| Staff granting themselves features                                          | High   | Entitlements read-only; permissions managed elsewhere and re-checked on the server.                          |
| Malicious logo upload                                                       | Medium | Only PNG/JPG/WebP data accepted; SVG rejected; size limit.                                                   |
| Users miss required fields on long forms                                    | Medium | Save disabled until valid; "Show what's missing" jumps to the first problem; live validation.                |

## 12. Success metrics (KPIs)

1. Time from account creation to completed setup (target: under one working day for a single-campus institution).
2. Percentage of save attempts rejected by the server after passing client validation (target: near zero).
3. Number of support tickets related to setup terminology or structure (target: falling release on release).
4. Audit coverage: 100 % of setup changes produce an audit entry.

## 13. Known gaps (current build)

1. Grading rules are not reset automatically when the institution type changes; users load the new type's defaults on the Grading tab.
2. Most dashboard metrics are still school-shaped; only the learner terminology adapts.
3. Data in the demo build is held in the browser; the production institution API is a dependency.

## 14. Approval

| Role             | Name | Signature | Date |
| ---------------- | ---- | --------- | ---- |
| Product Owner    |      |           |      |
| Business Sponsor |      |           |      |
| Engineering Lead |      |           |      |
| QA Lead          |      |           |      |
