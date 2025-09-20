import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const E_164_REGEX: RegExp = /^\+(\d{1,3})(\d{4,14})$/;

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control?.value && !E_164_REGEX.test(control.value)) {
      return { invalidPhone: 'Phone number is not in valid E.164 format' };
    }
    return null;
  };
}
