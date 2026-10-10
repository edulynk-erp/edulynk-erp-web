'use client';

import { DESIGNATIONS } from '@/config/designations';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { IncompleteFormHint } from '@/components/ui/form-status';
import { Dialog } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import type { Role } from '@/domain/access';
import type { User } from '@/domain/users';
import { z } from '@/lib/validation/zod';
import { isServiceError } from '@/services/errors';
import { describeError, usePrincipal, useServiceQuery, useServices, useWorkspace } from '@/services/provider';
import { LIVE_VALIDATION } from '@/lib/validation/form-options';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter the full name.').max(120),
  email: z.string().trim().min(1, 'Enter an email address.').max(254).email('Enter a valid email address.'),
  mobile: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{10,16}$/, 'Enter a valid mobile number.'),
  employeeId: z.string().trim().max(32),
  campusId: z.string().min(1, 'Select a campus.'),
  departmentId: z.string(),
  designationId: z.string().min(1, 'Select a designation.'),
  roleId: z.string().min(1, 'Select a role.'),
});
type Values = z.infer<typeof schema>;

const EMPTY: Values = {
  fullName: '',
  email: '',
  mobile: '',
  employeeId: '',
  campusId: '',
  departmentId: '',
  designationId: '',
  roleId: '',
};

/** Roles that are not assigned from this screen. */
const NOT_ASSIGNABLE = new Set(['owner']);

function valuesOf(user: User | null): Values {
  if (!user) return EMPTY;
  return {
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    employeeId: user.employeeId ?? '',
    campusId: user.campusId,
    departmentId: user.departmentId ?? '',
    designationId: user.designationId,
    roleId: user.roleId,
  };
}

/** Creates a user (and sends a simulated invitation) or, when `user` is given, edits that user's profile and role. */
export function UserFormDialog({
  open,
  roles,
  user = null,
  onClose,
}: {
  open: boolean;
  roles: readonly Role[];
  user?: User | null;
  onClose: () => void;
}) {
  const services = useServices();
  const toast = useToast();
  const principal = usePrincipal();
  const { campuses } = useWorkspace();
  const departments = useServiceQuery((s) => s.institution.listDepartments(), []);
  const editing = user !== null;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    trigger,
    formState: { errors, isSubmitting, isValid },
  } = useForm<Values>({ resolver: zodResolver(schema), ...LIVE_VALIDATION, defaultValues: valuesOf(user) });

  useEffect(() => {
    if (open) reset(valuesOf(user));
  }, [open, user, reset]);

  const held = new Set(principal.grants);
  const assignable = roles.filter(
    (role) =>
      role.id === user?.roleId || (!NOT_ASSIGNABLE.has(role.id) && role.grants.every((grant) => held.has(grant))),
  );

  const close = () => {
    reset(EMPTY);
    onClose();
  };

  const submit = handleSubmit(async (values) => {
    if (!services) return;
    const profile = {
      fullName: values.fullName,
      mobile: values.mobile,
      employeeId: values.employeeId || null,
      campusId: values.campusId,
      departmentId: values.departmentId || null,
      designationId: values.designationId,
    };
    try {
      if (user) {
        const updated = await services.users.update(user.id, {
          ...profile,
          ...(values.roleId !== user.roleId ? { roleId: values.roleId } : {}),
        });
        toast.notify({ tone: 'success', title: `${updated.fullName} updated` });
      } else {
        const created = await services.users.create({
          ...profile,
          email: values.email,
          roleId: values.roleId,
          customGrants: [],
        });
        toast.notify({
          tone: 'success',
          title: `${created.user.fullName} invited`,
          description: 'Simulated: the invitation email is in the demo inbox. No real email was sent.',
        });
      }
      close();
    } catch (error) {
      if (isServiceError(error) && error.fieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field in EMPTY) setError(field as keyof Values, { message });
        }
      }
      toast.notify({
        tone: 'error',
        title: editing ? 'Changes not saved' : 'User not created',
        description: describeError(error),
      });
    }
  });

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? () => {} : close}
      title={editing ? `Edit ${user.fullName}` : 'Create New User'}
      description={
        editing
          ? 'Update the profile, campus and role. Changing the role removes any extra permissions given to this user.'
          : 'The user receives an invitation to set their password. In the demo, the email is simulated.'
      }
      className="max-w-2xl"
      footer={
        <>
          {!isValid && !isSubmitting ? (
            <IncompleteFormHint
              onReveal={() => void trigger(undefined, { shouldFocus: true })}
              className="mr-auto self-center"
            />
          ) : null}
          <Button variant="outline" onClick={close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={isSubmitting} disabled={!isValid || !services}>
            {editing ? (isSubmitting ? 'Saving…' : 'Save changes') : isSubmitting ? 'Creating…' : 'Create & Invite'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <FormField label="Full Name" error={errors.fullName?.message} required>
          <Input autoComplete="off" placeholder="Anita Sharma" {...register('fullName')} />
        </FormField>
        <FormField
          label="Email Address"
          error={errors.email?.message}
          required={!editing}
          {...(editing ? { hint: 'The sign-in email cannot be changed.' } : {})}
        >
          <Input
            type="email"
            autoComplete="off"
            placeholder="name@school.edu.in"
            readOnly={editing}
            className={editing ? 'bg-muted/50 text-muted-foreground' : undefined}
            {...register('email')}
          />
        </FormField>
        <FormField label="Mobile Number" error={errors.mobile?.message} required>
          <Input type="tel" autoComplete="off" placeholder="+91 98765 43210" {...register('mobile')} />
        </FormField>
        <FormField label="Employee ID" error={errors.employeeId?.message} hint="Optional">
          <Input autoComplete="off" {...register('employeeId')} />
        </FormField>
        <FormField label="Campus" error={errors.campusId?.message} required>
          <Select {...register('campusId')}>
            <option value="">Select campus</option>
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Department" error={errors.departmentId?.message} hint="Optional">
          <Select {...register('departmentId')}>
            <option value="">No department</option>
            {(departments.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Designation" error={errors.designationId?.message} required>
          <Select {...register('designationId')}>
            <option value="">Select designation</option>
            {DESIGNATIONS.map((designation) => (
              <option key={designation.id} value={designation.id}>
                {designation.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Role" error={errors.roleId?.message} required>
          <Select {...register('roleId')}>
            <option value="">Select role</option>
            {assignable.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </Select>
        </FormField>
      </form>
    </Dialog>
  );
}
