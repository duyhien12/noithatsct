'use client';
import { Field } from './Form';

/** Giữ API cũ (label/required/error) — render bằng Field của hệ thống mới. */
export default function FormGroup({ label, required, children, error, hint }) {
    return (
        <Field label={label} required={required} error={error} hint={hint} className="ui-form-group-legacy">
            {children}
        </Field>
    );
}
