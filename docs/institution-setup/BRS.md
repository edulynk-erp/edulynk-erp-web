# Business Requirements Specification (BRS) — Institution Setup

|                         |                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Product                 | Edulynk ERP (web)                                                                                                                              |
| Module                  | Institution Setup (`/institution-setup`)                                                                                                       |
| Document type           | Business Requirements Specification                                                                                                            |
| Version                 | 1.0                                                                                                                                            |
| Date                    | 11 October 2026                                                                                                                                |
| Parent document         | [BRD — Business Requirements Document](./BRD.md)                                                                                               |
| Source of truth in code | `src/config/institution-types.ts`, `src/lib/validation/institution.ts`, `src/demo/services/institution-setup.ts`, `src/features/institution/*` |

Priority: **M** = Must, **S** = Should, **C** = Could. Every requirement traces to a business requirement (BR-xx) in the BRD.

---

## 1. Conventions

1. "Save" means the service call succeeded; the change is then audited and visible to every screen.
2. "Required" fields show a red asterisk and `aria-required`; Save stays disabled until they are valid.
3. Validation messages appear **while typing** (and on leaving a field); the server re-validates every write with the same rules.
4. "Institution-wide user" means a user whose access covers all campuses. "Campus-scoped user" covers only listed campuses.

## 2. Navigation and page structure

| ID     | Requirement                                                                                                                                                                                                                                                                                                          | Priority | Trace |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| NAV-01 | The page shall show a breadcrumb (Dashboard › Institution Setup › current tab), a heading and a description.                                                                                                                                                                                                         | M        | BR-19 |
| NAV-02 | The page shall have these tabs in order: General Information, Campuses & Locations, Academic Structure, Academic Calendar, Grading & Assessment, Branding & Appearance, Policies & Preferences, Feature Entitlements.                                                                                                | M        | BR-03 |
| NAV-03 | The selected tab (and sub-section for Structure and Calendar) shall be kept in the URL (`?tab=…&section=…`) so links and reloads open the same place. Unknown or retired tabs (e.g. `contact`, `address`) open General Information. Legacy `?tab=academic&section=…` links open the tab that now holds that section. | M        | BR-19 |
| NAV-04 | Academic Structure sub-sections: Structure, Classes & Sections, Subjects, Departments (Classes/Sections/Subjects for schools only).                                                                                                                                                                                  | M        | BR-06 |
| NAV-05 | Academic Calendar sub-sections: Academic Years, Terms & Semesters, Holidays, Exams & Events.                                                                                                                                                                                                                         | M        | BR-08 |
| NAV-06 | A side panel shall show the logo card, Quick Information (type, type identifier, totals, current year, plan, member since, structure at a glance) and a Permission Summary for the signed-in role.                                                                                                                   | S        | BR-01 |
| NAV-07 | While data loads, skeleton placeholders shall be shown; on load failure an error state with "Try again" shall be shown.                                                                                                                                                                                              | M        | BR-19 |

## 3. Roles and permissions

### 3.1 Permission model

Permissions come from the user's role (Users & Access) for the `institution` module: **view, create, edit, delete, export, approve**, plus **branding edit** (separate `branding` module) and the user's **campus scope**.

| ID     | Requirement                                                                                                                                                                                                                                                             | Priority | Trace |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| PER-01 | Users without `institution:view` shall not see the module.                                                                                                                                                                                                              | M        | BR-14 |
| PER-02 | Users without edit rights (or campus-scoped users) shall see institution-wide settings read-only with a "Read-only" badge; fields are disabled and no Save is shown.                                                                                                    | M        | BR-14 |
| PER-03 | Changing the institution type shall require `institution:approve`; without it the type picker is disabled with the message "Changing the institution type needs the Approve permission. Ask the institution owner." The service shall reject the change with FORBIDDEN. | M        | BR-02 |
| PER-04 | Changing branding (display name, tagline, colours, logo) shall require `branding:edit`; the service shall reject branding changes without it.                                                                                                                           | M        | BR-11 |
| PER-05 | Institution-wide records (profile, structure naming, academic years, terms, subjects, departments, grading, policies, structure templates) shall only be writable by institution-wide users.                                                                            | M        | BR-14 |
| PER-06 | Campus-scoped users shall create, edit and delete only campus records (campuses, classes, sections, campus-bound structure entries, campus calendar entries) for campuses in their scope.                                                                               | M        | BR-14 |
| PER-07 | Making an academic year current shall require `institution:approve`.                                                                                                                                                                                                    | M        | BR-08 |
| PER-08 | Export shall require `institution:export`.                                                                                                                                                                                                                              | M        | BR-17 |
| PER-09 | Every permission shall be re-checked by the service on every write, regardless of what the UI shows.                                                                                                                                                                    | M        | BR-14 |
| PER-10 | No screen in this module shall allow a user to change their own permissions or the subscription entitlements.                                                                                                                                                           | M        | BR-13 |

### 3.2 Permission matrix (default roles)

| Action                              | Owner       | Institution Admin          | Campus-scoped admin | View-only |
| ----------------------------------- | ----------- | -------------------------- | ------------------- | --------- |
| View all tabs                       | ✓           | ✓                          | ✓                   | ✓         |
| Edit General / Policies             | ✓           | ✓                          | — (read-only)       | —         |
| Change institution type             | ✓ (approve) | —                          | —                   | —         |
| Edit branding                       | ✓           | if granted `branding:edit` | —                   | —         |
| Manage campuses                     | ✓           | ✓                          | own campuses (edit) | —         |
| Structure / years / terms / grading | ✓           | ✓                          | —                   | —         |
| Make a year current                 | ✓           | —                          | —                   | —         |
| Export                              | ✓           | if granted                 | if granted          | —         |

## 4. Institution type

### 4.1 Types and what they determine

| Type                          | Learner / Educator   | Unit / Group        | Structure levels (top → bottom)                                                    | Default periods  | Default grading | Location kinds                                                |
| ----------------------------- | -------------------- | ------------------- | ---------------------------------------------------------------------------------- | ---------------- | --------------- | ------------------------------------------------------------- |
| School                        | Student / Teacher    | Class / Section     | Classes & Sections + Subjects screens; Terms & Examinations                        | 2 terms          | Grades          | Campus, Branch                                                |
| Junior / Intermediate College | Student / Lecturer   | Year / Group        | Years/Grades → Groups/Streams → Subjects → Subject Combinations → Examinations     | 1 annual session | Marks           | Campus, Branch                                                |
| Degree College                | Student / Faculty    | Programme / Section | Departments → Programmes → Years/Semesters → Courses & Electives                   | 2 semesters      | CGPA            | Campus, Study Centre                                          |
| University                    | Student / Faculty    | Programme / Section | Faculties/Schools → Departments → Programmes → Semesters/Terms → Courses & Credits | 2 semesters      | CGPA            | Campus, Constituent College, Affiliated College, Study Centre |
| Coaching / Training Institute | Learner / Trainer    | Course / Batch      | Courses → Batches → Subjects/Modules → Schedules → Assessments                     | 4 quarters       | Marks           | Branch, Campus, Study Centre                                  |
| Other Educational Institution | Learner / Instructor | Programme / Group   | Programmes → Groups → Modules → Assessments                                        | 2 terms          | Marks           | Campus, Branch, Study Centre                                  |

Key modules highlighted per type: School — admissions, attendance, timetable, examinations, fees, transport; Junior College — + hostel; Degree College — college, admissions, attendance, examinations, fees, library; University — college, admissions, examinations, fees, library, hostel; Coaching — admissions, attendance, timetable, examinations, fees, communication; Other — admissions, attendance, examinations, fees, communication.

### 4.2 Requirements

| ID     | Requirement                                                                                                                                                                                                                | Priority | Trace        |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| TYP-01 | The type picker shall show all six types as cards with icon, name and description; the saved type shows a "Saved" badge.                                                                                                   | M        | BR-01        |
| TYP-02 | Selecting a different type shall open a confirmation: "Change the institution type to X?" explaining that terminology, structure, required identifiers and dashboard summaries follow the new type and nothing is deleted. | M        | BR-02        |
| TYP-03 | After confirming, the form shows the new type with a notice "The type changes from A to B when you save…"; nothing is persisted until Save Changes. Selecting the saved type again needs no confirmation.                  | M        | BR-02        |
| TYP-04 | On save, the service shall record an audit entry `institution.type-changed` ("Institution type changed from A to B; existing records kept").                                                                               | M        | BR-14        |
| TYP-05 | Type-specific details of every type shall be retained; only the selected type's details are validated and required. Switching back restores earlier details and structure entries.                                         | M        | BR-02, BR-04 |
| TYP-06 | Terminology shall follow the type in Institution Setup (capacity label, policies wording, side panel totals) and on the owner dashboard (learner label).                                                                   | M        | BR-01        |
| TYP-07 | Until the type change is saved, the Academic Structure tab shall keep showing the saved type's structure with a notice that the new type applies after saving.                                                             | M        | BR-02        |
| TYP-08 | Structure entries belonging to another type shall be kept but read-only; editing or deleting them returns: "This entry belongs to the X structure. It is kept, but can only be changed while the institution type is X."   | M        | BR-02        |
| TYP-09 | Existing locations keep their kind after a type change; new or changed locations must use a kind the current type allows ("A {type} cannot add a {kind}.").                                                                | M        | BR-05        |
| TYP-10 | Grading rules are not changed by a type change; the Grading tab offers "Load {Type} Defaults".                                                                                                                             | M        | BR-10        |

## 5. General Information

One page containing: Institution Type, Basic Information, type-specific details, Contact Details and Address Information.

### 5.1 Basic Information

| Field                 | Required | Rules / message                                                                                                |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| Institution Name      | Yes      | 3–120 characters.                                                                                              |
| Short Name            | Yes      | 2–20 characters. Hint: "Shown where space is limited."                                                         |
| Category              | Yes      | One of: Private Unaided, Private Aided, Government, Autonomous, Deemed, Trust / Society, Other.                |
| Established Year      | Yes      | Whole number 1800 – current year.                                                                              |
| Website               | No       | Empty, or full web address `http(s)://domain.tld/…` ("Enter a full web address, like https://school.edu.in."). |
| Official Email        | Yes      | Valid email, max 254.                                                                                          |
| {Learner} Capacity    | Yes      | Whole number 1 – 100,000. Label follows type (Student / Learner).                                              |
| Medium of Instruction | Yes      | From reference list.                                                                                           |

### 5.2 Type-specific details

| Type           | Field                            | Required | Rules                                |
| -------------- | -------------------------------- | -------- | ------------------------------------ |
| School         | Education Board                  | Yes      | From board list.                     |
|                | Affiliation Number               | No       | Letters, digits, `/` or `-`; max 40. |
|                | UDISE Code                       | No       | Exactly 11 digits if entered.        |
| Junior College | Intermediate Board               | Yes      | From intermediate board list.        |
|                | College Code                     | No       | 2–20 letters, digits or hyphens.     |
|                | Affiliation / Recognition Number | No       | Letters, digits, `/` or `-`; max 40. |
| Degree College | Affiliating University           | Yes      | At least 3 characters; max 120.      |
|                | College Code                     | No       | 2–20 letters, digits or hyphens.     |
|                | Affiliation Number               | No       | Letters, digits, `/` or `-`.         |
|                | Accreditation                    | No       | From accreditation list or blank.    |
|                | Autonomous college               | No       | Switch.                              |
| University     | University Category              | Yes      | From category list.                  |
|                | Accreditation                    | No       | From list or blank.                  |
|                | Recognition Details              | No       | Max 300 characters.                  |
| Coaching       | Course Categories                | Yes      | At least one, all from the list.     |
|                | Registration Number              | No       | Letters, digits, `/` or `-`.         |
| Other          | What You Offer                   | Yes      | At least 5 characters; max 300.      |
|                | Registration Number              | No       | Letters, digits, `/` or `-`.         |

### 5.3 Contact Details

| Field                  | Required | Rules                                                          |
| ---------------------- | -------- | -------------------------------------------------------------- |
| Primary Contact Person | Yes      | 2–80 characters.                                               |
| Designation            | Yes      | 2–80 characters.                                               |
| Contact Number         | Yes      | 10–13 digits, optional leading `+`, spaces or hyphens allowed. |
| Alternate Number       | No       | Same format, or blank.                                         |
| Contact Email          | Yes      | Valid email.                                                   |
| Support Email          | Yes      | Valid email.                                                   |

### 5.4 Address Information

| Field          | Required | Rules                                                             |
| -------------- | -------- | ----------------------------------------------------------------- |
| Address Line 1 | Yes      | 3–120 characters.                                                 |
| Address Line 2 | No       | Max 120.                                                          |
| Country        | Yes      | From list. Changing it clears State, District and City.           |
| State          | Yes      | Must belong to the country. Changing it clears District and City. |
| District       | Yes      | Must belong to the state.                                         |
| City           | Yes      | Must belong to the state.                                         |
| PIN Code       | Yes      | 6 digits, not starting with 0.                                    |

### 5.5 Requirements

| ID     | Requirement                                                                                                                                                                                                                                                                                               | Priority | Trace |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| GEN-01 | All fields above shall be shown on General Information and saved together with Policies and Branding as one institution record.                                                                                                                                                                           | M        | BR-03 |
| GEN-02 | Save Changes shall be disabled while nothing has changed, while any field is invalid, or while saving; a spinner shows during save.                                                                                                                                                                       | M        | BR-16 |
| GEN-03 | When the form is invalid, "Complete the required fields to continue. Show what's missing" shall appear; the link validates everything, lists the tabs with errors in a banner ("Fix the highlighted fields before saving:"), switches to the first tab with an error and focuses the first invalid field. | M        | BR-16 |
| GEN-04 | Cancel shall be enabled only with unsaved changes and shall ask "Discard unsaved changes?" before restoring saved values.                                                                                                                                                                                 | M        | BR-18 |
| GEN-05 | An "Unsaved changes" indicator shall show while the form is dirty, and the browser shall warn before leaving the page with unsaved changes.                                                                                                                                                               | M        | BR-18 |
| GEN-06 | On success, a toast shall confirm "Institution settings saved" (or, after a type change, "The institution is now set up as a X. Earlier details are kept.").                                                                                                                                              | M        | BR-03 |
| GEN-07 | Field errors returned by the service shall be shown on the matching fields.                                                                                                                                                                                                                               | M        | BR-16 |
| GEN-08 | The service shall audit `institution.updated` with the number of changed fields.                                                                                                                                                                                                                          | M        | BR-14 |

## 6. Campuses & Locations

| Field          | Required | Rules                                             |
| -------------- | -------- | ------------------------------------------------- |
| Location Type  | Yes      | One of the kinds allowed by the institution type. |
| Name           | Yes      | 2–80 characters; unique (case-insensitive).       |
| Code           | Yes      | 2–12 capital letters, digits or hyphens; unique.  |
| Address        | Yes      | 5–200 characters.                                 |
| City           | Yes      | From reference list.                              |
| PIN Code       | Yes      | 6 digits, not starting with 0.                    |
| Contact Person | No       | Max 80.                                           |
| Phone          | Yes      | Valid phone.                                      |
| Email          | Yes      | Valid email.                                      |
| Status         | Yes      | Active / Inactive.                                |

| ID     | Requirement                                                                                                                                                                                                                         | Priority | Trace |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| CAM-01 | The tab shall list locations with kind, code, city, classes (schools), status and row actions, and show counts per kind.                                                                                                            | M        | BR-05 |
| CAM-02 | Add Location (institution-wide users with create) and Edit (users with edit for that campus) shall open a dialog with the fields above.                                                                                             | M        | BR-05 |
| CAM-03 | At least one campus shall stay active ("At least one campus must stay active.").                                                                                                                                                    | M        | BR-05 |
| CAM-04 | The only campus cannot be deleted. A campus used by classes, users, staff, students or structure entries cannot be deleted; the message lists the counts ("X is still used by 3 classes, 12 students. Move or remove them first."). | M        | BR-15 |
| CAM-05 | Audit: `campus.created`, `campus.updated`, `campus.deleted`.                                                                                                                                                                        | M        | BR-14 |

## 7. Academic Structure

### 7.1 Structure settings (per type)

| Field            | Rules                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Level names      | Optional custom name per level, max 40, no `< > { }`. Blank = default name. |
| Period type      | Term, Semester, Trimester, Quarter or Annual session.                       |
| Periods per year | Whole number 1–6.                                                           |

### 7.2 Structure entries

Common fields: Level, Belongs to (parent), Name (2–120), Code (up to 16 capital letters/digits/hyphens, upper-cased), Campus (blank = institution-wide), Status. Additional fields depend on the level:

| Field                                 | Used by (examples)                  | Rules when required                                         |
| ------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Duration (value + years/months/weeks) | Programmes, Courses (coaching)      | 1–120                                                       |
| Terms/semesters                       | Programmes                          | 1–24                                                        |
| Credits                               | Courses, Modules                    | 0–60, whole or half                                         |
| Course type                           | Subjects, Courses                   | Core, Elective, Practical, Project, Language                |
| Programme level                       | Programmes                          | Certificate, Diploma, Undergraduate, Postgraduate, Doctoral |
| Degree                                | Programmes                          | Max 40, e.g. B.Sc., M.Tech.                                 |
| Research / Practical                  | University programmes / courses     | Switches                                                    |
| Capacity                              | Streams, Programmes, Batches        | 1–10,000                                                    |
| Start and end dates                   | Batches, Examinations, Assessments  | End not before start                                        |
| Schedule                              | Schedules, Groups                   | Max 120, e.g. "Mon–Fri 6–8 PM"                              |
| Maximum marks                         | Examinations, Assessments, Subjects | 1–1000                                                      |
| Weightage %                           | Examinations, Assessments           | 0–100                                                       |
| Subjects (members)                    | Subject Combinations                | 2–12 subjects                                               |

| ID     | Requirement                                                                                                                                                                                                                           | Priority | Trace |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| STR-01 | The Structure section shall show the type's levels as a flow, with each level's entries in a table, a parent filter ("All {parent plural}") and counts.                                                                               | M        | BR-06 |
| STR-02 | Structure settings shall let institution-wide editors rename levels and set the period type and periods per year; the period plural shall be used elsewhere (e.g. "8 semesters").                                                     | M        | BR-06 |
| STR-03 | Entries shall be validated against their level: the level must exist for the type, a parent is required where the level demands one, and the level's required fields must be filled. Fields a level does not use are cleared on save. | M        | BR-06 |
| STR-04 | Codes shall be unique within a level; names unique under the same parent.                                                                                                                                                             | M        | BR-15 |
| STR-05 | An entry cannot change its level after creation.                                                                                                                                                                                      | M        | BR-06 |
| STR-06 | An entry with entries under it, or used in a subject combination, cannot be deleted (message lists what uses it).                                                                                                                     | M        | BR-15 |
| STR-07 | For non-school types, when the structure is empty, "Load starter structure" shall add a typical structure for the type. It is refused for schools and when entries already exist.                                                     | S        | BR-07 |
| STR-08 | Schools shall use Classes & Sections and Subjects screens (7.3).                                                                                                                                                                      | M        | BR-06 |
| STR-09 | Audit: `structure.settings-updated`, `structure.created`, `structure.updated`, `structure.deleted`, `structure.template-loaded`.                                                                                                      | M        | BR-14 |

### 7.3 Schools: Classes, Sections, Subjects, Departments

| Record     | Fields and rules                                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Class      | Campus (required), Class level (from the level list), Name (1–40).                                                                                                         |
| Section    | Class (required), Name (up to 10 letters/digits/spaces/hyphens; stored upper-case; unique within class and year), Capacity (1–80). Created for the selected academic year. |
| Subject    | Name (2–80), Code (2–12 capitals/digits/hyphens), Type (Core, Language, Elective, Co-curricular), First and Last class (last not before first), Department (optional).     |
| Department | Name (2–80), Code (2–12 capitals/digits/hyphens).                                                                                                                          |

| ID     | Requirement                                                                                                              | Priority | Trace |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | -------- | ----- |
| SCH-01 | Sections cannot be created in a closed academic year.                                                                    | M        | BR-08 |
| SCH-02 | A section with enrolled students cannot move to another class, and its capacity cannot be set below the number enrolled. | M        | BR-15 |
| SCH-03 | Departments and subjects in use cannot be deleted (message lists usage).                                                 | M        | BR-15 |
| SCH-04 | Audit: `class.*`, `section.*`, `subject.*`, `department.*` created/updated/deleted.                                      | M        | BR-14 |

## 8. Academic Calendar

| Record          | Fields and rules                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Academic year   | Label (4–20, unique), Start date, End date (after start; at most 13 months); must not overlap another year. Status: Planned, Current, Closed. |
| Term / semester | Name (2–40, unique within the year), Start and End (end after start; within the year; must not overlap another term of the year).             |
| Calendar entry  | Title (3–120), Type (Event, Examination, Holiday, Meeting), Start and End (end not before start), Campus (required), Audience (2–80).         |

| ID     | Requirement                                                                                                                         | Priority | Trace |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| CAL-01 | New academic years are created as Planned.                                                                                          | M        | BR-08 |
| CAL-02 | Only a Planned year can be made current (approve permission); doing so closes the previous current year.                            | M        | BR-08 |
| CAL-03 | Closed years cannot be edited; their terms cannot be added, changed or removed.                                                     | M        | BR-08 |
| CAL-04 | Only Planned years can be deleted, and only when no terms, sections or students use them.                                           | M        | BR-15 |
| CAL-05 | The Terms section shall use the period name of the type (e.g. "Semesters", "Quarters").                                             | M        | BR-01 |
| CAL-06 | Calendar entries shall be listed for the selected academic year.                                                                    | M        | BR-09 |
| CAL-07 | Audit: `academic-year.created/updated/activated/deleted`, `term.created/updated/deleted`, `calendar.event-created/updated/deleted`. | M        | BR-14 |

## 9. Grading & Assessment

| Field                        | Rules                                                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Method                       | Marks, Grades, GPA or CGPA.                                                                                                                                             |
| Maximum marks                | 10–1000.                                                                                                                                                                |
| Overall pass mark %          | 1–100.                                                                                                                                                                  |
| Subject pass mark %          | 0–100.                                                                                                                                                                  |
| Pass each component          | Switch.                                                                                                                                                                 |
| Grade-point scale            | 4, 5 or 10.                                                                                                                                                             |
| CGPA → % multiplier          | Blank or 1–25.                                                                                                                                                          |
| Use credits                  | Switch.                                                                                                                                                                 |
| Rounding                     | None, Nearest, Up.                                                                                                                                                      |
| Grade bands (2–20)           | Grade (1–20, unique), Lowest % and Highest % (0–100, lowest ≤ highest), Grade point (required for GPA/CGPA; 0–10; not above the scale), Remark (max 60), Pass (switch). |
| Assessment components (1–10) | Name (2–60, unique), Kind (Internal, External, Practical, Project), Weightage % (1–100).                                                                                |
| Transcript                   | Title (3–60); show marks, grades, grade points, credits, cumulative, rank; footer note (max 200).                                                                       |

| ID     | Requirement                                                                                                                                          | Priority | Trace |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| GRD-01 | Bands shall start at 0 % and end at 100 % with no overlaps and no gaps; at least one band shall be a pass.                                           | M        | BR-10 |
| GRD-02 | Component weightages shall total exactly 100 %.                                                                                                      | M        | BR-10 |
| GRD-03 | "Load {Type} Defaults" shall fill the form with the type's typical rules without saving; Save Grading persists.                                      | M        | BR-10 |
| GRD-04 | Save Grading shall be disabled when nothing changed or the form is invalid; "Show what's missing" marks all problems. Cancel asks before discarding. | M        | BR-16 |
| GRD-05 | Last update by and date shall be shown. Audit `grading.updated`.                                                                                     | M        | BR-14 |

## 10. Branding & Appearance

| Field            | Required | Rules                                                          |
| ---------------- | -------- | -------------------------------------------------------------- |
| Display Name     | Yes      | 2–60 characters.                                               |
| Tagline          | No       | Max 120.                                                       |
| Primary Colour   | Yes      | `#RRGGBB`.                                                     |
| Secondary Colour | Yes      | `#RRGGBB`.                                                     |
| Logo             | No       | PNG, JPG or WebP, at most 1 MB; SVG never accepted. Removable. |
| Time Zone        | Yes      | From list.                                                     |
| Default Language | Yes      | From list.                                                     |
| Date Format      | Yes      | DD/MM/YYYY, MM/DD/YYYY or YYYY-MM-DD.                          |
| Time Format      | Yes      | 12-hour or 24-hour.                                            |

| ID     | Requirement                                                                                         | Priority | Trace |
| ------ | --------------------------------------------------------------------------------------------------- | -------- | ----- |
| BRN-01 | A live preview shall show the logo or initials and the colours applied to sample buttons.           | S        | BR-11 |
| BRN-02 | Only users with `branding:edit` may change brand identity and logo; others see them read-only.      | M        | BR-11 |
| BRN-03 | The logo card in the side panel shall allow Change (opens Branding) and Remove for permitted users. | S        | BR-11 |
| BRN-04 | Branding shall be applied across the ERP (sidebar, reports, documents) after save.                  | M        | BR-11 |

## 11. Policies & Preferences

| Field                        | Required | Rules                     |
| ---------------------------- | -------- | ------------------------- |
| Working days                 | Yes      | At least one of Mon–Sun.  |
| Day starts at / ends at      | Yes      | `HH:MM`; end after start. |
| Late arrival grace (minutes) | Yes      | 0–60.                     |
| Minimum attendance %         | Yes      | 50–100.                   |
| Fee due day                  | Yes      | 1–28.                     |
| Late fee per day (₹)         | Yes      | 0–10,000.                 |
| Absence alerts to guardians  | —        | Switch.                   |
| Fee reminders                | —        | Switch.                   |
| Publish results online       | —        | Switch.                   |

| ID     | Requirement                                                                                                      | Priority | Trace |
| ------ | ---------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| POL-01 | Wording shall follow the type's terminology (e.g. "the college day", "Learners below this…").                    | M        | BR-01 |
| POL-02 | Policies are saved with the institution record (same Save, Cancel and validation behaviour as GEN-02 to GEN-05). | M        | BR-12 |

## 12. Feature Entitlements

| ID     | Requirement                                                                                                                                                                                  | Priority | Trace |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| ENT-01 | The tab shall list every module with its description and status: Included, Add-on or Not included, and show "X of Y modules are included" on the plan.                                       | M        | BR-13 |
| ENT-02 | Modules key to the institution type shall be listed first with a "Key for your type" badge.                                                                                                  | S        | BR-01 |
| ENT-03 | The tab shall be read-only, with the note "Entitlements are managed by Edulynk under your subscription and cannot be changed here", linking to Users & Roles for users who can manage roles. | M        | BR-13 |

## 13. Export

| ID     | Requirement                                                                                                       | Priority | Trace |
| ------ | ----------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| EXP-01 | Users with export permission shall download the setup as a JSON file named `institution-setup-{short-name}.json`. | S        | BR-17 |
| EXP-02 | The Export button shall show a spinner and be disabled while exporting.                                           | M        | BR-16 |

## 14. Forms and feedback (cross-cutting)

| ID     | Requirement                                                                                                                                                                                                     | Priority | Trace |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| FRM-01 | All dropdowns shall use the app's accessible custom select (keyboard navigation, type-ahead, not clipped inside dialogs).                                                                                       | M        | BR-19 |
| FRM-02 | Validation shall run on change and on blur; messages update on every keystroke.                                                                                                                                 | M        | BR-16 |
| FRM-03 | Submit buttons shall stay disabled until required fields are valid, with the hint "Complete the required fields to continue" and a "Show what's missing" action that marks every problem and focuses the first. | M        | BR-16 |
| FRM-04 | Submit and confirm buttons shall show a spinner and be disabled while the action runs; dialogs cannot be closed mid-save.                                                                                       | M        | BR-16 |
| FRM-05 | Success and failure shall be reported with toasts; service field errors shall be mapped to the fields.                                                                                                          | M        | BR-16 |
| FRM-06 | Delete actions shall ask for confirmation and keep the dialog open with the reason if the service refuses.                                                                                                      | M        | BR-15 |

## 15. Audit

| ID     | Requirement                                                                                                                                                                                                                                                                       | Priority | Trace |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| AUD-01 | Every write shall record module `institution`, action, human-readable summary, subject id, actor and timestamp.                                                                                                                                                                   | M        | BR-14 |
| AUD-02 | Actions: `institution.updated`, `institution.type-changed`, `campus.*`, `academic-year.*` (incl. `activated`), `class.*`, `section.*`, `department.*`, `subject.*`, `calendar.event-*`, `structure.*` (incl. `settings-updated`, `template-loaded`), `term.*`, `grading.updated`. | M        | BR-14 |

## 16. Service interface (institution API)

The web app calls these operations; the production API must provide them with the same validation, authorisation and errors.

| Area                   | Operations                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Institution            | `getInstitution`, `getOverview`, `updateInstitution`                                                                                             |
| Campuses               | `listCampuses`, `createCampus`, `updateCampus`, `deleteCampus`                                                                                   |
| Academic years         | `listAcademicYears`, `createAcademicYear`, `updateAcademicYear`, `setCurrentAcademicYear`, `deleteAcademicYear`                                  |
| Classes / Sections     | `listClasses`, `createClass`, `updateClass`, `deleteClass`, `listSections(yearId)`, `createSection(yearId)`, `updateSection`, `deleteSection`    |
| Departments / Subjects | `list…`, `create…`, `update…`, `delete…`                                                                                                         |
| Calendar               | `listCalendarEvents(yearId)`, `createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent`                                                |
| Structure              | `updateStructureSettings(type)`, `listAcademicUnits`, `createAcademicUnit`, `updateAcademicUnit`, `deleteAcademicUnit`, `applyStructureTemplate` |
| Terms                  | `listAcademicTerms(yearId)`, `createAcademicTerm(yearId)`, `updateAcademicTerm`, `deleteAcademicTerm`                                            |
| Grading                | `getGradingConfig`, `updateGradingConfig`                                                                                                        |
| Entitlements           | `listEntitlements` (read-only)                                                                                                                   |

Error categories: `VALIDATION` (with field errors), `FORBIDDEN`, `NOT_FOUND`, `CONFLICT` (business rule, e.g. record in use, closed year).

## 17. Non-functional requirements

| ID     | Requirement                                                                                                                                                                                  | Priority | Trace |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----- |
| NFR-01 | Accessibility: WCAG 2.1 AA; every control labelled; errors linked with `aria-describedby` and `aria-invalid`; required fields `aria-required`; keyboard operable; automated axe checks pass. | M        | BR-19 |
| NFR-02 | Security: strict CSP (no inline styles/scripts); sealed server-side sessions; server-side authorisation of every write; logo restricted to raster images; no secrets in the browser.         | M        | BR-20 |
| NFR-03 | Performance: tab switch and form feedback feel instant (< 100 ms for validation); list loads show skeletons.                                                                                 | S        | BR-19 |
| NFR-04 | Responsiveness: usable from tablet width upward; tables scroll horizontally on narrow screens.                                                                                               | M        | BR-19 |
| NFR-05 | Data integrity: client and server share the same validation rules; the server is the authority.                                                                                              | M        | BR-14 |
| NFR-06 | Demo isolation: demo services and data never ship in or activate in production builds.                                                                                                       | M        | BR-20 |
| NFR-07 | Quality gates: lint (zero warnings), type-check, unit/component tests, production build and production-build verification pass before release.                                               | M        | —     |

## 18. Acceptance criteria (samples)

1. **Type change** — Given an Owner on General Information, when they pick Degree College and confirm, then Education Board and UDISE disappear, Affiliating University becomes required and Save stays disabled until it is filled; after saving, the toast says the institution is now a Degree College and an `institution.type-changed` audit entry exists; switching back to School shows the earlier board and UDISE values.
2. **Permission** — Given an Institution Admin without approve, the type picker is disabled with the explanatory message, and a direct service call to change the type returns FORBIDDEN.
3. **Live validation** — When a user types `anita@` in an email field, "Enter a valid email address…" appears immediately and clears once the address is complete.
4. **Save gating** — With Institution Name cleared, Save Changes is disabled and "Show what's missing" focuses Institution Name.
5. **Campus deletion** — Deleting a campus with students shows "… is still used by N students. Move or remove them first." and the campus remains.
6. **Academic year** — Making a planned year current closes the previous current year; the closed year can no longer be edited.
7. **Grading** — Bands 0–39 and 41–100 cannot be saved ("Leaves a gap after grade …"); components 40 % + 50 % cannot be saved ("… add up to 90%; they must total 100%").
8. **Entitlements** — No control on the Feature Entitlements tab changes an entitlement.

## 19. Traceability (BR → specification)

| BR    | Specification sections                    |
| ----- | ----------------------------------------- |
| BR-01 | 4, TYP-06, POL-01, ENT-02, CAL-05         |
| BR-02 | TYP-02 – TYP-08                           |
| BR-03 | 5, GEN-01 – GEN-08                        |
| BR-04 | 5.2, TYP-05                               |
| BR-05 | 6, TYP-09                                 |
| BR-06 | 7                                         |
| BR-07 | STR-07                                    |
| BR-08 | 8, SCH-01                                 |
| BR-09 | 8 (calendar entries)                      |
| BR-10 | 9, TYP-10                                 |
| BR-11 | 10, PER-04                                |
| BR-12 | 11                                        |
| BR-13 | 12, PER-10                                |
| BR-14 | 3, 15, PER-09                             |
| BR-15 | CAM-04, STR-06, SCH-02/03, CAL-04, FRM-06 |
| BR-16 | 14, GEN-02/03, GRD-04                     |
| BR-17 | 13                                        |
| BR-18 | GEN-04, GEN-05                            |
| BR-19 | NFR-01, NFR-03, NFR-04, FRM-01            |
| BR-20 | NFR-02, NFR-06                            |

## 20. Open items

1. Automatically offering grading defaults after a type change (today: manual "Load defaults").
2. Type-aware dashboard metrics beyond the learner label.
3. Production institution API implementing section 16 with the same rules.
